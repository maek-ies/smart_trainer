// Intervals.icu Service - Fetch workouts and upload activities

// Intervals.icu Service - Fetch workouts and upload activities

// Use relative path for proxying (works in Dev via Vite, Prod via Netlify Function)
const API_BASE = '/api/intervals';

/**
 * Create authorization header using API Key (Basic Auth)
 * Username: "API_KEY", Password: your personal API key
 */
function getAuthHeader(apiKey) {
    const credentials = btoa(`API_KEY:${apiKey.trim()}`);
    return `Basic ${credentials}`;
}

/**
 * Fetch today's planned workout for an athlete
 * @param {Object} profile - User profile with intervalsApiKey and intervalsAthleteId
 * @returns {Promise<Object|null>} - Workout object, error object, or null if none found
 */
export async function fetchTodayWorkout(profile) {
    if (!profile?.intervalsApiKey || !profile?.intervalsAthleteId) {
        console.warn('Intervals.icu credentials not configured');
        return { error: 'Please configure your Intervals.icu credentials in profile settings.' };
    }

    // Use '0' as athleteId for personal API keys as recommended
    const today = new Date().toISOString().split('T')[0];
    const url = `${API_BASE}/athlete/0/events?oldest=${today}&newest=${today}&resolve=true&category=WORKOUT`;

    console.debug('[Intervals] Fetching workouts from:', url);
    console.debug('[Intervals] Using API Key:', profile.intervalsApiKey ? `${profile.intervalsApiKey.substring(0, 4)}...${profile.intervalsApiKey.slice(-4)}` : 'MISSING');

    try {
        const response = await fetch(
            url,
            {
                method: 'GET',
                headers: {
                    Authorization: getAuthHeader(profile.intervalsApiKey),
                    Accept: 'application/json',
                },
            }
        );

        console.debug('[Intervals] Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Intervals] Failed to fetch events:', response.status, response.statusText, errorText);

            if (response.status === 401 || response.status === 403) {
                return { error: 'Invalid API credentials. Please check your Athlete ID and API Key.' };
            }
            if (response.status === 404) {
                return { error: 'Athlete not found. Please check your Athlete ID.' };
            }
            return { error: `Connection failed: ${response.status} ${response.statusText}` };
        }

        const events = await response.json();

        // Filter for workout events (type === 'Workout')
        const workouts = events.filter(e => e.type === 'Workout' && e.workout_doc);

        if (workouts.length === 0) {
            console.log('No workouts scheduled for today');
            return null;
        }

        // Return the first workout
        const workout = workouts[0];
        return {
            id: workout.id,
            name: workout.name || 'Untitled Workout',
            description: workout.description,
            workoutDoc: workout.workout_doc,
            steps: parseWorkoutSteps(workout.workout_doc),
        };

    } catch (error) {
        console.error('Error fetching workout:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { error: 'Network error. Please check your internet connection.' };
        }
        return { error: 'Failed to fetch workout. Please try again.' };
    }
}

/**
 * Parse workout_doc into actionable steps
 * @param {Object} workoutDoc - The workout_doc from Intervals.icu
 * @returns {Array} - Array of step objects with duration and target power
 */
function parseWorkoutSteps(workoutDoc) {
    if (!workoutDoc || !workoutDoc.steps) {
        return [];
    }

    const steps = [];

    function processStep(step) {
        if (step.steps) {
            // Nested steps (e.g., intervals with repeats)
            const repeatCount = step.reps || 1;
            for (let i = 0; i < repeatCount; i++) {
                step.steps.forEach(s => processStep(s));
            }
        } else {
            // Single step
            let powerObj = null;

            if (step.power) {
                let val = step.power.value;
                let start = step.power.start;
                let end = step.power.end;
                let units = step.power.units || '';
                const unitsLower = String(units).toLowerCase();

                // Debug raw step data
                // console.log('[Intervals] Parsing step:', { val, start, end, units });

                // Handle Zone targets
                // Heuristic: If units imply Zones OR units imply % but value is small (1-7)
                const isExplicitZone = unitsLower.includes('zone');

                // Check if units are compatible with implicit zones (missing, %, %ftp)
                const isPercentUnits = !units || unitsLower === '%' || unitsLower === '%ftp';

                // Check values: val, or start/end range
                // We use relaxed comparison for strings "1" == 1
                const isZoneValue = (v) => v != null && v >= 1 && v <= 7;

                // It's implicit zone if units are percent-ish AND (value is 1-7 OR start/end are 1-7)
                // However, we must be careful not to trigger on 5% recovery if that exists (unlikely to be 5% explicitly, usually 40-50%)
                const matchesZoneValue = isZoneValue(val) || (val == null && (isZoneValue(start) || isZoneValue(end)));

                const isImplicitZone = isPercentUnits && matchesZoneValue;

                if (isExplicitZone || isImplicitZone) {
                    const zoneMap = {
                        1: 55,   // Z1 (0-55%) -> 55%
                        2: 65,   // Z2 (56-75%) -> 65% (Mid)
                        3: 83,   // Z3 (76-90%) -> 83% (Mid)
                        4: 98,   // Z4 (91-105%) -> 98% (Mid)
                        5: 113,  // Z5 (106-120%) -> 113% (Mid)
                        6: 135,  // Z6 (121-150%) -> 135% (Mid)
                        7: 151   // Z7 (151%+) -> 151%
                    };

                    const mapZ = (v) => {
                        if (v != null && zoneMap[Math.round(v)]) return zoneMap[Math.round(v)];
                        return v;
                    };

                    // Apply mapping
                    if (val != null && zoneMap[Math.round(val)]) {
                        val = mapZ(val);
                        // If it was a steady zone state, set start/end
                        start = val;
                        end = val;
                        units = '%';
                    } else {
                        // Handle range zones 
                        if (start != null) start = mapZ(start);
                        if (end != null) end = mapZ(end);
                        if (start || end) units = '%';
                    }
                }

                powerObj = {
                    value: val,
                    start: start,
                    end: end,
                    units: units
                };
            }

            steps.push({
                duration: step.duration || 0, // Duration in seconds
                power: powerObj, // Full object with units
                cadence: step.cadence?.value || null,
                name: step.name || '',
            });
        }
    }

    workoutDoc.steps.forEach(s => processStep(s));
    return steps;
}

/**
 * Upload a completed activity (FIT file) to Intervals.icu
 * @param {Blob} fitBlob - The FIT file as a Blob
 * @param {string} filename - Filename for the activity
 * @param {Object} profile - User profile with intervalsApiKey and intervalsAthleteId
 * @returns {Promise<Object>} - Upload result
 */
export async function uploadActivity(fitBlob, filename, profile) {
    if (!profile?.intervalsApiKey || !profile?.intervalsAthleteId) {
        throw new Error('Intervals.icu credentials not configured');
    }

    const formData = new FormData();
    formData.append('file', fitBlob, filename);

    const url = `${API_BASE}/athlete/0/activities`;
    console.debug('[Intervals] Uploading activity to:', url);

    try {
        const response = await fetch(
            url,
            {
                method: 'POST',
                headers: {
                    Authorization: getAuthHeader(profile.intervalsApiKey),
                },
                body: formData,
            }
        );

        console.debug('[Intervals] Upload response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Intervals] Upload failed:', response.status, response.statusText, errorText);
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Activity uploaded successfully:', result);
        return result;

    } catch (error) {
        console.error('Error uploading activity:', error);
        throw error;
    }
}

/**
 * Check if profile has Intervals.icu configured
 */
export function isIntervalsConfigured(profile) {
    return !!(profile?.intervalsApiKey && profile?.intervalsAthleteId);
}

/**
 * Fetch athlete profile and recent summary stats
 * @param {Object} profile - User profile
 * @returns {Promise<Object>} Combined athlete and summary data
 */
export async function fetchAthleteSummary(profile) {
    if (!profile?.intervalsApiKey || !profile?.intervalsAthleteId) {
        return { error: 'Intervals.icu credentials not configured' };
    }

    try {
        const headers = {
            Authorization: getAuthHeader(profile.intervalsApiKey),
            Accept: 'application/json',
        };

        // 1. Fetch Athlete Settings (FTP, HR, etc.)
        const athleteRes = await fetch(`${API_BASE}/athlete/0`, { headers });
        if (!athleteRes.ok) {
            throw new Error(`Failed to fetch athlete data: ${athleteRes.status}`);
        }
        const athlete = await athleteRes.json();
        console.log('[Intervals] Athlete Data:', athlete);

        // Extract FTP from sportSettings (usually the first one or specific to Ride)
        // sportSettings is an array of objects like { types: ['Ride'], ftp: 200, ... }
        let ftp = athlete.ftp;
        if (!ftp && athlete.sportSettings) {
            const rideSettings = athlete.sportSettings.find(s => s.types && (s.types.includes('Ride') || s.types.includes('VirtualRide')));
            if (rideSettings) {
                ftp = rideSettings.ftp;
            }
        }

        // 2. Fetch recent summary (last 42 days for charts, but we verify connection mostly)
        // We'll just ask for the last few days to get current fitness/fatigue
        const today = new Date().toISOString().split('T')[0];
        // 7 days ago
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const summaryUrl = `${API_BASE}/athlete/0/athlete-summary?start=${weekAgo}&end=${today}`;
        const summaryRes = await fetch(summaryUrl, { headers });

        let recentSummary = null;
        if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            console.log('[Intervals] Summary Data:', summaryData);
            // Get the last entry (today or most recent)
            if (summaryData.length > 0) {
                recentSummary = summaryData[summaryData.length - 1];
            }
        }

        // 3. Fetch upcoming activities (today + next 3 days)
        const todayStr = new Date().toISOString().split('T')[0];
        const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const eventsUrl = `${API_BASE}/athlete/0/events?oldest=${todayStr}&newest=${threeDaysLater}&resolve=true&category=WORKOUT`;
        const eventsRes = await fetch(eventsUrl, { headers });

        let upcomingActivities = [];
        if (eventsRes.ok) {
            const events = await eventsRes.json();
            console.log('[Intervals] Upcoming events raw:', events);
            upcomingActivities = events
                .filter(e => e.workout_doc || e.type === 'Workout')
                .map(e => ({
                    id: e.id,
                    date: e.start_date_local.split('T')[0],
                    name: e.name,
                    duration: e.workout_doc?.duration || e.planned_duration || 0,
                    load: e.icu_training_load || e.training_load || e.workout_doc?.load || 0,
                    intensity: e.icu_intensity || e.intensity || e.workout_doc?.intensity || 0,
                    steps: parseWorkoutSteps(e.workout_doc),
                    description: e.description || e.workout_doc?.description || '',
                }))
                .slice(0, 4); // Include today if multiple
        }

        return {
            id: athlete.id,
            name: `${athlete.firstname} ${athlete.lastname}`,
            ftp: ftp,
            eFTP: recentSummary?.eftp || recentSummary?.icu_eftp || athlete.icu_eftp || 0,
            weight: athlete.weight || athlete.icu_weight,
            maxHr: athlete.icu_max_hr || athlete.max_hr,
            restingHr: athlete.icu_resting_hr || athlete.resting_hr,
            fitness: recentSummary?.fitness || recentSummary?.ctl || 0,
            fatigue: recentSummary?.fatigue || recentSummary?.atl || 0,
            form: recentSummary?.form || recentSummary?.tsb || 0,
            acwr: recentSummary?.acwr || 0,
            load: recentSummary?.training_load || recentSummary?.load || 0,
            upcomingActivities
        };

    } catch (error) {
        console.error('Error fetching summary:', error);
        return { error: error.message };
    }
}
