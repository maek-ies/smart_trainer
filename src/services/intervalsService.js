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
            steps.push({
                duration: step.duration || 0, // Duration in seconds
                power: step.power?.value || null, // Absolute watts if resolved
                powerLow: step.power?.start || null,
                powerHigh: step.power?.end || null,
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

        return {
            id: athlete.id,
            name: `${athlete.firstname} ${athlete.lastname}`,
            ftp: athlete.ftp,
            weight: athlete.weight,
            maxHr: athlete.icu_max_hr || athlete.max_hr,
            restingHr: athlete.icu_resting_hr || athlete.resting_hr,
            fitness: recentSummary?.ctl || 0, // CTL = Fitness
            fatigue: recentSummary?.atl || 0, // ATL = Fatigue
            form: recentSummary?.tsb || 0,    // TSB = Form
            load: recentSummary?.load || 0
        };

    } catch (error) {
        console.error('Error fetching summary:', error);
        return { error: error.message };
    }
}
