import { getPowerZone, getHRZone } from './zoneService';

// Ride Recorder - Manages in-memory buffer of ride data

class RideRecorder {
    constructor() {
        this.isRecording = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseStartTime = null;
        this.totalPausedDuration = 0;
        this.dataPoints = [];
        this.rrIntervals = [];
        this.lastDistance = 0;
    }

    /**
     * Start recording a new ride
     */
    startRecording() {
        this.isRecording = true;
        this.isPaused = false;
        this.startTime = Date.now();
        this.pauseStartTime = null;
        this.totalPausedDuration = 0;
        this.dataPoints = [];
        this.rrIntervals = [];
        this.lastDistance = 0;

        this.persistToStorage();
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        if (!this.isRecording || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartTime = Date.now();
        this.persistToStorage();
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        if (!this.isRecording || !this.isPaused) return;
        const pausedDuration = Date.now() - this.pauseStartTime;
        this.totalPausedDuration += pausedDuration;
        this.isPaused = false;
        this.pauseStartTime = null;
        this.persistToStorage();
    }

    /**
     * Add a data point from trainer
     */
    addDataPoint(data) {
        if (!this.isRecording || this.isPaused) return;

        const now = data.timestamp || Date.now();
        const elapsed = now - this.startTime - this.totalPausedDuration;

        // Calculate time delta from last point for distance approximation
        let timeDelta = 0;
        if (this.dataPoints.length > 0) {
            timeDelta = (now - this.dataPoints[this.dataPoints.length - 1].timestamp) / 1000;
        }

        // Handle distance: use trainer data if available and increasing, otherwise calculate from speed
        let currentDistance = this.lastDistance;

        if (data.distance && data.distance > this.lastDistance) {
            currentDistance = data.distance;
        } else if (data.speed > 0 && timeDelta > 0) {
            // Speed is km/h, convert to m/s: speed / 3.6
            // Distance = speed * time
            const distIncrement = (data.speed / 3.6) * timeDelta; // meters
            currentDistance += distIncrement;
        }

        this.lastDistance = currentDistance;

        const point = {
            timestamp: now,
            elapsed: Math.max(0, elapsed), // Ensure non-negative
            power: data.power || 0,
            cadence: data.cadence || 0,
            speed: data.speed || 0,
            hr: data.hr || 0,
            distance: currentDistance,
        };

        this.dataPoints.push(point);

        // Periodically save to localStorage (every 10 points)
        if (this.dataPoints.length % 10 === 0) {
            this.persistToStorage();
        }
    }

    /**
     * Add HR data with RR intervals
     */
    addHRData(data) {
        if (!this.isRecording || this.isPaused) return;

        // Update HR in the latest data point
        if (this.dataPoints.length > 0) {
            this.dataPoints[this.dataPoints.length - 1].hr = data.hr;
        }

        // Store RR intervals for HRV analysis
        if (data.rrIntervals && data.rrIntervals.length > 0) {
            this.rrIntervals.push(...data.rrIntervals.map(rr => ({
                timestamp: data.timestamp,
                rr,
            })));
        }
    }

    /**
     * Stop recording
     */
    stopRecording(profile = null) {
        this.isRecording = false;
        this.isPaused = false;
        localStorage.removeItem('ride_in_progress');

        return this.getRideData(profile);
    }

    /**
     * Get complete ride data
     */
    getRideData(profile = null) {
        if (this.dataPoints.length === 0) {
            return null;
        }

        const duration = this.dataPoints.length > 0
            ? this.dataPoints[this.dataPoints.length - 1].elapsed
            : 0;

        const avgPower = this.dataPoints.length > 0
            ? Math.round(this.dataPoints.reduce((sum, p) => sum + p.power, 0) / this.dataPoints.length)
            : 0;

        const avgCadence = this.dataPoints.length > 0
            ? Math.round(this.dataPoints.reduce((sum, p) => sum + p.cadence, 0) / this.dataPoints.length)
            : 0;

        const avgHr = this.dataPoints.filter(p => p.hr > 0).length > 0
            ? Math.round(this.dataPoints.filter(p => p.hr > 0).reduce((sum, p) => sum + p.hr, 0) / this.dataPoints.filter(p => p.hr > 0).length)
            : 0;

        const maxPower = Math.max(...this.dataPoints.map(p => p.power));
        const maxHr = Math.max(...this.dataPoints.map(p => p.hr));

        const distance = this.lastDistance / 1000; // Convert to km

        // Calculate time in zones if profile is provided
        const timeInPowerZones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
        const timeInHrZones = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        if (profile) {
            this.dataPoints.forEach((p, i) => {
                // Calculate duration of this point (usually 1s)
                let pointDuration = 1000;
                if (i > 0) {
                    pointDuration = p.timestamp - this.dataPoints[i - 1].timestamp;
                }

                const pZone = getPowerZone(p.power, profile.ftp);
                if (pZone.zone > 0) {
                    timeInPowerZones[pZone.zone] = (timeInPowerZones[pZone.zone] || 0) + pointDuration;
                }

                if (p.hr > 0) {
                    const hZone = getHRZone(p.hr, profile.maxHr);
                    if (hZone.zone > 0) {
                        timeInHrZones[hZone.zone] = (timeInHrZones[hZone.zone] || 0) + pointDuration;
                    }
                }
            });
        }

        return {
            startTime: this.startTime,
            duration,
            dataPoints: this.dataPoints,
            rrIntervals: this.rrIntervals,
            summary: {
                avgPower,
                avgCadence,
                avgHr,
                maxPower,
                maxHr,
                distance,
                timeInPowerZones: profile ? timeInPowerZones : undefined,
                timeInHrZones: profile ? timeInHrZones : undefined,
            }
        };
    }

    /**
     * Persist current data to localStorage
     */
    persistToStorage() {
        localStorage.setItem('ride_in_progress', JSON.stringify({
            startTime: this.startTime,
            pauseStartTime: this.pauseStartTime,
            totalPausedDuration: this.totalPausedDuration,
            isPaused: this.isPaused,
            dataPoints: this.dataPoints.slice(-600), // Keep last 10 minutes max
            rrIntervals: this.rrIntervals.slice(-20000), // Keep last ~3-5 hours of RR
        }));
    }

    /**
     * Attempt to recover a ride from localStorage
     */
    recoverRide() {
        const saved = localStorage.getItem('ride_in_progress');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.startTime = data.startTime;
                this.pauseStartTime = data.pauseStartTime;
                this.totalPausedDuration = data.totalPausedDuration || 0;
                this.isPaused = data.isPaused || false;
                this.dataPoints = data.dataPoints || [];
                this.rrIntervals = data.rrIntervals || [];
                this.isRecording = true;
                return true;
            } catch (e) {
                console.error('Failed to recover ride:', e);
                localStorage.removeItem('ride_in_progress');
            }
        }
        return false;
    }

    /**
     * Get all data points for the current session
     */
    getFullSessionData() {
        return this.dataPoints;
    }

    /**
     * Get recent data for charts (last N seconds)
     */
    getRecentData(seconds = 120) {
        // If we want accurate charts relative to elapsed time, we might need to filter by 'elapsed'
        // For simple visualization, timestamp filtering is usually okay, but let's check.
        // If the user pauses for 5 minutes, there will be a gap in timestamps.
        const now = Date.now();
        const cutoff = now - (seconds * 1000);
        return this.dataPoints.filter(p => p.timestamp >= cutoff);
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedSeconds() {
        if (!this.startTime) return 0;

        let currentPauseDuration = 0;
        if (this.isPaused && this.pauseStartTime) {
            currentPauseDuration = Date.now() - this.pauseStartTime;
        }

        const elapsedMs = Date.now() - this.startTime - this.totalPausedDuration - currentPauseDuration;
        return Math.floor(Math.max(0, elapsedMs) / 1000);
    }
}

// Singleton instance
const rideRecorder = new RideRecorder();
export default rideRecorder;
