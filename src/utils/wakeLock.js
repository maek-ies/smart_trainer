// Wake Lock Utility - Prevents screen from sleeping during workouts

let wakeLock = null;

/**
 * Check if Wake Lock API is supported
 */
export function isWakeLockSupported() {
    return 'wakeLock' in navigator;
}

/**
 * Request a screen wake lock
 */
export async function requestWakeLock() {
    if (!isWakeLockSupported()) {
        console.warn('Wake Lock API is not supported in this browser');
        return false;
    }

    try {
        wakeLock = await navigator.wakeLock.request('screen');

        wakeLock.addEventListener('release', () => {
            console.log('Wake Lock was released');
        });

        console.log('Wake Lock is active');
        return true;
    } catch (err) {
        console.error(`Failed to acquire wake lock: ${err.name}, ${err.message}`);
        return false;
    }
}

/**
 * Release the wake lock
 */
export async function releaseWakeLock() {
    if (wakeLock !== null) {
        await wakeLock.release();
        wakeLock = null;
        console.log('Wake Lock released');
    }
}

/**
 * Re-acquire wake lock when page becomes visible again
 * Call this once to set up the listener
 */
export function setupWakeLockReacquisition() {
    const handleVisibilityChange = async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Return cleanup function
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
}

/**
 * Check if wake lock is currently active
 */
export function isWakeLockActive() {
    return wakeLock !== null && !wakeLock.released;
}
