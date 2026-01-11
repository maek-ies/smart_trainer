// FIT Service - Generate FIT files from ride data
import { FitWriter } from '@markw65/fit-file-writer';

/**
 * Generate a FIT file from ride data
 * @param {Object} rideData - Ride data from rideRecorder
 * @param {Object} profile - User profile with FTP and maxHR
 * @returns {Blob} - FIT file blob ready for download
 */
export function generateFitFile(rideData, profile) {
    try {
        if (!rideData || !rideData.dataPoints || rideData.dataPoints.length === 0) {
            throw new Error('No ride data to export');
        }

        const fitWriter = new FitWriter();
        const startTime = new Date(rideData.startTime);

        // File ID message
        fitWriter.writeMessage('file_id', {
            type: 'activity',
            manufacturer: 'development',
            product: 0,
            time_created: fitWriter.time(startTime),
            serial_number: 0x12345678,
        });

        // File creator message
        fitWriter.writeMessage('file_creator', {
            software_version: 100,
        });

        // Device info
        fitWriter.writeMessage('device_info', {
            timestamp: fitWriter.time(startTime),
            manufacturer: 'development',
            product: 0,
            serial_number: 0x12345678,
            device_index: 0,
            source_type: 'local',
        });

        // Sport and sub-sport
        fitWriter.writeMessage('sport', {
            sport: 'cycling',
            sub_sport: 'indoor_cycling',
        });

        // User profile data
        if (profile) {
            fitWriter.writeMessage('user_profile', {
                friendly_name: profile.name,
                // Note: 'ftp' is not a standard user_profile field in this library's definition.
                // We'll put it in 'session' instead.
            });
        }

        // Session message (summary)
        const sessionStartTime = fitWriter.time(startTime);
        const totalElapsedTime = Math.round(rideData.duration / 1000); // ms to seconds

        fitWriter.writeMessage('session', {
            timestamp: fitWriter.time(new Date(rideData.startTime + rideData.duration)),
            start_time: sessionStartTime,
            total_elapsed_time: totalElapsedTime,
            total_timer_time: totalElapsedTime,
            sport: 'cycling',
            sub_sport: 'indoor_cycling',
            total_distance: rideData.summary.distance * 1000, // km to meters
            avg_power: rideData.summary.avgPower,
            max_power: rideData.summary.maxPower,
            avg_heart_rate: rideData.summary.avgHr || undefined,
            max_heart_rate: rideData.summary.maxHr || undefined,
            avg_cadence: rideData.summary.avgCadence,
            threshold_power: profile?.ftp || undefined,
            num_laps: 1,
            first_lap_index: 0,
            trigger: 'activity_end',
        });

        // Lap message (single lap for entire ride)
        fitWriter.writeMessage('lap', {
            timestamp: fitWriter.time(new Date(rideData.startTime + rideData.duration)),
            start_time: sessionStartTime,
            total_elapsed_time: totalElapsedTime,
            total_timer_time: totalElapsedTime,
            sport: 'cycling',
            total_distance: rideData.summary.distance * 1000,
            avg_power: rideData.summary.avgPower,
            max_power: rideData.summary.maxPower,
            avg_heart_rate: rideData.summary.avgHr || undefined,
            max_heart_rate: rideData.summary.maxHr || undefined,
            avg_cadence: rideData.summary.avgCadence,
            lap_trigger: 'session_end',
        });

        // Record messages (data points)
        rideData.dataPoints.forEach((point) => {
            const timestamp = new Date(point.timestamp);
            const record = {
                timestamp: fitWriter.time(timestamp),
                power: point.power || 0,
                cadence: point.cadence || undefined,
                speed: point.speed ? point.speed / 3.6 : undefined, // km/h to m/s
                distance: point.distance || undefined,
                heart_rate: point.hr > 0 ? point.hr : undefined,
            };

            fitWriter.writeMessage('record', record);
        });

        // Optional: HRV messages
        if (rideData.rrIntervals && rideData.rrIntervals.length > 0) {
            // Group RR intervals by timestamp
            const rrMap = new Map();
            rideData.rrIntervals.forEach(rr => {
                const key = rr.timestamp;
                if (!rrMap.has(key)) rrMap.set(key, []);
                rrMap.get(key).push(rr.rr);
            });

            for (const [timestamp, rrValues] of rrMap.entries()) {
                fitWriter.writeMessage('hrv', {
                    timestamp: fitWriter.time(new Date(timestamp)),
                    time: rrValues.map(v => Math.round(v)) // library scale is 1000 (ms to s)
                });
            }
        }

        // Activity message
        fitWriter.writeMessage('activity', {
            timestamp: fitWriter.time(new Date(rideData.startTime + rideData.duration)),
            total_timer_time: totalElapsedTime,
            num_sessions: 1,
            type: 'manual',
            event: 'activity',
            event_type: 'stop',
        });

        // Finish and get the FIT file data
        const fitData = fitWriter.finish();
        const fitBytes = new Uint8Array(fitData.buffer, fitData.byteOffset, fitData.byteLength);

        // Create blob
        return new Blob([fitBytes], { type: 'application/octet-stream' });
    } catch (err) {
        console.error('FIT generation failed:', err);
        throw err;
    }
}

/**
 * Trigger download of FIT file in browser
 * @param {Blob} fitBlob - FIT file blob
 * @param {string} filename - Filename for download
 */
export function downloadFitFile(fitBlob, filename = 'ride.fit') {
    const url = URL.createObjectURL(fitBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Generate filename from ride start time
 * @param {number} startTime - Ride start timestamp
 * @returns {string} - Formatted filename
 */
export function generateFitFilename(startTime) {
    const date = new Date(startTime);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}_${hh}-${min}_indoor_cycling.fit`;
}
