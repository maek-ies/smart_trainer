// Ride History Service - Manages past rides in localStorage

const RIDE_HISTORY_KEY = 'smart_trainer_ride_history';

/**
 * Get all past rides
 */
export function getRideHistory() {
    try {
        const history = localStorage.getItem(RIDE_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('Error reading ride history:', e);
        return [];
    }
}

/**
 * Save a new ride to history
 * @param {Object} rideData - Ride data with summary and dataPoints
 * @param {string} profileId - The profile ID who completed the ride
 */
export function saveRideToHistory(rideData, profileId = null) {
    if (!rideData) return;

    try {
        const history = getRideHistory();

        // Store full ride data for FIT file generation
        const historyEntry = {
            id: crypto.randomUUID(),
            profileId: profileId || rideData.profileId || null, // Store which profile completed this ride
            startTime: rideData.startTime,
            duration: rideData.duration,
            summary: rideData.summary,
            // Store full data for FIT export (we'll limit history size to manage storage)
            dataPoints: rideData.dataPoints,
            rrIntervals: rideData.rrIntervals,
        };

        history.unshift(historyEntry); // Add to beginning

        // Limit history to last 30 rides to manage localStorage size
        const limitedHistory = history.slice(0, 30);

        localStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(limitedHistory));
        return historyEntry;
    } catch (e) {
        console.error('Error saving ride to history:', e);
        // If storage is full, try limiting to 20 rides
        if (e.name === 'QuotaExceededError') {
            try {
                const history = getRideHistory().slice(0, 19);
                localStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(history));
                console.warn('Reduced history size due to storage constraints');
            } catch (e2) {
                console.error('Failed to save even after reducing history:', e2);
            }
        }
    }
}

/**
 * Get ride history for a specific profile
 * @param {string} profileId - The profile ID to filter by
 */
export function getRideHistoryForProfile(profileId) {
    if (!profileId) return [];
    const allHistory = getRideHistory();
    return allHistory.filter(ride => ride.profileId === profileId);
}

/**
 * Delete a ride from history
 */
export function deleteRideFromHistory(rideId) {
    try {
        const history = getRideHistory().filter(r => r.id !== rideId);
        localStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error deleting ride from history:', e);
    }
}

/**
 * Clear all ride history
 */
export function clearRideHistory() {
    localStorage.removeItem(RIDE_HISTORY_KEY);
}
