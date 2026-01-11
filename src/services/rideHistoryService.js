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
 */
export function saveRideToHistory(rideData) {
    if (!rideData) return;

    try {
        const history = getRideHistory();
        
        // Prepare a summary for history (don't save thousands of data points to keep localStorage clean)
        // You might want to save full data points if you plan to show detailed charts later,
        // but for now, we'll save summary + condensed data if needed.
        const historyEntry = {
            id: crypto.randomUUID(),
            startTime: rideData.startTime,
            duration: rideData.duration,
            summary: rideData.summary,
            // Optionally store a downsampled version of dataPoints for history charts
            // dataPoints: downsample(rideData.dataPoints, 100), 
        };

        history.unshift(historyEntry); // Add to beginning
        
        // Limit history to last 50 rides
        const limitedHistory = history.slice(0, 50);
        
        localStorage.setItem(RIDE_HISTORY_KEY, JSON.stringify(limitedHistory));
        return historyEntry;
    } catch (e) {
        console.error('Error saving ride to history:', e);
    }
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
