// Intervals.icu Service - Fetch workouts and upload activities

const API_BASE = 'https://intervals.icu/api/v1';

/**
 * Create authorization header using API Key (Basic Auth)
 * Username: "API_KEY", Password: your personal API key
 */
function getAuthHeader(apiKey) {
    const credentials = btoa(`API_KEY:${apiKey}`);
    return `Basic ${credentials}`;
}

/**
 * Fetch today's planned workout for an athlete
 * @param {Object} profile - User profile with intervalsApiKey and intervalsAthleteId
 * @returns {Promise<Object|null>} - Workout object or null if none found
 */
export async function fetchTodayWorkout(profile) {
    if (!profile?.intervalsApiKey || !profile?.intervalsAthleteId) {
        console.warn('Intervals.icu credentials not configured');
        return null;
    }

    const athleteId = profile.intervalsAthleteId;
    const today = new Date().toISOString().split('T')[0];

    try {
        const response = await fetch(
            `${API_BASE}/athlete/${athleteId}/events?oldest=${today}&newest=${today}&resolve=true`,
            {
                method: 'GET',
                headers: {
                    Authorization: getAuthHeader(profile.intervalsApiKey),
                    Accept: 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error('Failed to fetch events:', response.status, response.statusText);
            return null;
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
        return null;
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

    const athleteId = profile.intervalsAthleteId;

    const formData = new FormData();
    formData.append('file', fitBlob, filename);

    try {
        const response = await fetch(
            `${API_BASE}/athlete/${athleteId}/activities`,
            {
                method: 'POST',
                headers: {
                    Authorization: getAuthHeader(profile.intervalsApiKey),
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
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
