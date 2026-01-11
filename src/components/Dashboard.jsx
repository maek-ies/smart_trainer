import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
    connectTrainer,
    connectHRM,
    tryAutoConnect,
    setTargetPower as btSetTargetPower,
    isBluetoothSupported
} from '../services/bluetoothService';
import { getPowerZone, getHRZone } from '../services/zoneService';
import { requestWakeLock, releaseWakeLock, setupWakeLockReacquisition } from '../utils/wakeLock';
import rideRecorder from '../services/rideRecorder';
import { saveRideToHistory } from '../services/rideHistoryService';
import { fetchTodayWorkout } from '../services/intervalsService';
import { VO2MAX_TEST_WORKOUT } from '../services/workoutService';
import PowerChart from './PowerChart';
import HRChart from './HRChart';
import RideSummary from './RideSummary';
import WorkoutPlayer from './WorkoutPlayer';
import PlannedWorkoutMode from './PlannedWorkoutMode';
import './Dashboard.css';

// Memoized metric display
const Metric = memo(function Metric({ value, label, unit, className = '', color }) {
    return (
        <div className={`metric ${className}`}>
            <span
                className="metric-value"
                style={color ? { color: color, textShadow: `0 0 20px ${color}40` } : {}}
            >
                {value}
            </span>
            <span className="metric-label">{label}{unit && ` (${unit})`}</span>
        </div>
    );
});

// Memoized small metric
const MetricSmall = memo(function MetricSmall({ value, label, unit = '' }) {
    return (
        <div className="metric-small">
            <span className="metric-value">{value}{unit}</span>
            <span className="metric-label">{label}</span>
        </div>
    );
});

function Dashboard({ onSwitchProfile, onShowHistory }) {
    const {
        state,
        updateTrainerStatus,
        updateHRMStatus,
        updateTrainerData,
        updateHRData,
        setTargetPower,
        startRide,
        pauseRide,
        resumeRide,
        stopRide,
        updateElapsed,
    } = useApp();

    const timerRef = useRef(null);
    // Use ref to access latest state in callbacks and effects without dependencies issues
    const latestState = useRef(state);

    useEffect(() => {
        latestState.current = state;
    }, [state]);

    const [completedRide, setCompletedRide] = useState(null);
    const [todaysWorkout, setTodaysWorkout] = useState(null);
    const [showWorkoutPlayer, setShowWorkoutPlayer] = useState(false);
    const [isPlannedWorkoutActive, setIsPlannedWorkoutActive] = useState(false);

    // Format time as MM:SS or HH:MM:SS
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Handle trainer connection
    const handleConnectTrainer = async () => {
        if (!isBluetoothSupported()) {
            alert('Web Bluetooth is not supported in this browser. Please use Chrome on Android.');
            return;
        }

        try {
            const result = await connectTrainer({
                onData: (data) => {
                    updateTrainerData(data);
                },
                onConnectionChange: (status) => {
                    updateTrainerStatus(status);
                }
            });
            updateTrainerStatus('connected', result.name);
        } catch (err) {
            console.error('Failed to connect trainer:', err);
            updateTrainerStatus('disconnected');
        }
    };

    // Handle HRM connection
    const handleConnectHRM = async () => {
        try {
            const result = await connectHRM({
                onData: (data) => {
                    updateHRData(data);
                    rideRecorder.addHRData(data);
                }
            });
            updateHRMStatus('connected', result.name);
        } catch (err) {
            console.error('Failed to connect HRM:', err);
        }
    };

    // Auto-connect on mount
    useEffect(() => {
        if (isBluetoothSupported()) {
            const attemptAutoConnect = async () => {
                const results = await tryAutoConnect({
                    onTrainerData: (data) => {
                        updateTrainerData(data);
                    },
                    onHRMData: (data) => {
                        updateHRData(data);
                        rideRecorder.addHRData(data);
                    },
                    onConnectionChange: (status) => {
                        updateTrainerStatus(status);
                    }
                });

                if (results && results.trainer) {
                    console.log('Auto-connected Trainer:', results.trainer.name);
                    updateTrainerStatus('connected', results.trainer.name);
                }
                if (results && results.hrm) {
                    console.log('Auto-connected HRM:', results.hrm.name);
                    updateHRMStatus('connected', results.hrm.name);
                }
            };
            attemptAutoConnect();
        }
    }, [updateTrainerData, updateHRData, updateTrainerStatus, updateHRMStatus]);

    // Fetch workout on mount or profile change
    useEffect(() => {
        const loadWorkout = async () => {
            if (state.profile?.intervalsApiKey) {
                const workout = await fetchTodayWorkout(state.profile);
                setTodaysWorkout(workout);
                if (workout) {
                    setShowWorkoutPlayer(true);
                }
            } else {
                setTodaysWorkout(null);
                setShowWorkoutPlayer(false);
            }
        };
        loadWorkout();
    }, [state.profile]);

    // Adjust target power
    const adjustPower = useCallback(async (delta) => {
        const newPower = Math.max(50, Math.min(500, state.targetPower + delta));
        setTargetPower(newPower);
        await btSetTargetPower(newPower);
    }, [state.targetPower, setTargetPower]);

    // Start/Pause/Resume ride
    const toggleRide = useCallback(async () => {
        if (state.isRiding) {
            if (state.isPaused) {
                // Resume
                resumeRide();
                await requestWakeLock();
                rideRecorder.resumeRecording();
            } else {
                // Pause
                pauseRide();
                rideRecorder.pauseRecording();
                releaseWakeLock();
            }
        } else {
            // Check if trainer is connected before starting
            if (state.trainerStatus !== 'connected') {
                const proceed = window.confirm("Trainer not connected. Would you like to connect now?");
                if (proceed) {
                    handleConnectTrainer();
                    return;
                }
            }

            // Start fresh ride
            startRide();
            await requestWakeLock();
            rideRecorder.startRecording();

            // Set initial target power
            if (state.trainerStatus === 'connected') {
                await btSetTargetPower(state.targetPower);
            }
        }
    }, [state.isRiding, state.isPaused, state.trainerStatus, state.targetPower, startRide, pauseRide, resumeRide, handleConnectTrainer]);

    // Stop ride
    const handleStopRide = useCallback(() => {
        stopRide();
        releaseWakeLock();
        const rideData = rideRecorder.stopRecording(latestState.current.profile);

        if (rideData && rideData.dataPoints.length > 0) {
            // Save to local history
            saveRideToHistory(rideData);

            // Show ride summary modal
            console.log('Ride completed:', rideData.summary);
            setCompletedRide(rideData);
        }
    }, [stopRide]);

    // Data recording and timer effect
    useEffect(() => {
        if (state.isRiding && !state.isPaused) {
            timerRef.current = setInterval(() => {
                const s = latestState.current;

                // Record data point every second
                rideRecorder.addDataPoint({
                    power: s.power,
                    cadence: s.cadence,
                    speed: s.speed,
                    distance: s.distance,
                    hr: s.hr,
                    timestamp: Date.now()
                });

                updateElapsed(rideRecorder.getElapsedSeconds());
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [state.isRiding, state.isPaused, updateElapsed]);

    // Setup wake lock reacquisition
    useEffect(() => {
        const cleanup = setupWakeLockReacquisition();
        return cleanup;
    }, []);

    // Get zone info
    const powerZone = getPowerZone(state.power, state.profile?.ftp);
    const targetZone = getPowerZone(state.targetPower, state.profile?.ftp);
    const hrZone = getHRZone(state.hr, state.profile?.maxHr);

    // Slider bounds
    const sliderMin = 25;
    const sliderMax = Math.round((state.profile?.ftp || 200) * 1.50);

    return (
        <div className="dashboard">
            {/* Offline Banner */}
            {state.isOffline && (
                <div className="offline-banner">
                    📡 Offline Mode – Data will sync when connected
                </div>
            )}

            {/* Header */}
            <header className="dashboard-header compact">
                <div className="header-left">
                    <button className="btn btn-icon btn-profile-name" onClick={onSwitchProfile} title="Switch Profile">
                        👤 {state.profile?.name || 'Rider'}
                    </button>
                    <button className="btn btn-icon" onClick={onShowHistory} title="Ride History">
                        📜
                    </button>
                    {!state.isRiding && (
                        <button
                            className="btn btn-intervals btn-small"
                            onClick={() => setIsPlannedWorkoutActive(true)}
                            style={{ marginLeft: '8px', marginRight: '8px' }}
                        >
                            🚀 Planned Workout
                        </button>
                    )}
                </div>

                <div className="header-center">
                    <div className="ride-controls">
                        {!state.isRiding ? (
                            <button className="btn btn-start btn-small" onClick={toggleRide}>
                                ▶ Start
                            </button>
                        ) : (
                            <>
                                <button
                                    className={`btn btn-small ${state.isPaused ? 'btn-start' : 'btn-secondary'}`}
                                    onClick={toggleRide}
                                >
                                    {state.isPaused ? '▶ Resume' : '⏸ Pause'}
                                </button>
                                <button className="btn btn-stop btn-small" onClick={handleStopRide}>
                                    ⏹ Stop
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        className={`btn btn-xsmall btn-connect-status ${state.trainerStatus}`}
                        onClick={handleConnectTrainer}
                        disabled={state.trainerStatus === 'connecting'}
                    >
                        {state.trainerStatus === 'connected' ? '✅ Connected' :
                            state.trainerStatus === 'connecting' ? '⏳ Connecting...' :
                                '🔗 Connect'}
                    </button>
                    <div className="connection-indicators">
                        <span
                            className={`connection-dot ${state.trainerStatus}`}
                            title={state.trainerName || 'Trainer'}
                            onClick={handleConnectTrainer}
                        />
                        <span
                            className={`connection-dot ${state.hrmStatus}`}
                            title={state.hrmName || 'HRM'}
                            onClick={handleConnectHRM}
                        />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="dashboard-main">
                {/* ERG Control */}
                {/* ERG Control & Workout Player */}
                {showWorkoutPlayer && todaysWorkout ? (
                    <section className="chart-container">
                        <WorkoutPlayer
                            workout={todaysWorkout}
                            isRunning={state.isRiding}
                            onTargetPowerChange={(power) => {
                                if (state.trainerStatus === 'connected') {
                                    setTargetPower(power);
                                    btSetTargetPower(power);
                                }
                            }}
                            onComplete={() => {
                                console.log('Workout complete!');
                                // Optional: play sound or notification
                            }}
                        />
                        <div className="text-center" style={{ marginTop: '8px' }}>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => setShowWorkoutPlayer(false)}
                            >
                                Switch to Manual Mode
                            </button>
                        </div>
                    </section>
                ) : (
                    <section className="erg-control card-elevated">
                        <div className="erg-buttons">
                            <button
                                className="erg-btn"
                                onClick={() => adjustPower(-5)}
                                disabled={state.trainerStatus !== 'connected'}
                            >
                                −
                            </button>
                            <div className="erg-display">
                                <div
                                    className="erg-target"
                                    style={{ color: `var(--zone-${targetZone.zone})`, textShadow: `0 0 30px var(--zone-${targetZone.zone})` }}
                                >
                                    {state.targetPower}
                                </div>
                                <div className="erg-label">Target Watts</div>
                            </div>
                            <button
                                className="erg-btn"
                                onClick={() => adjustPower(5)}
                                disabled={state.trainerStatus !== 'connected'}
                            >
                                +
                            </button>
                        </div>
                        <div className="slider-container">
                            <input
                                type="range"
                                min={sliderMin}
                                max={sliderMax}
                                step="5"
                                value={state.targetPower}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setTargetPower(val);
                                    btSetTargetPower(val);
                                }}
                                className="power-slider"
                                disabled={state.trainerStatus !== 'connected'}
                            />
                        </div>
                        {todaysWorkout && (
                            <div className="text-center" style={{ marginTop: '16px' }}>
                                <button
                                    className="btn btn-intervals btn-small"
                                    onClick={() => setShowWorkoutPlayer(true)}
                                >
                                    Load "{todaysWorkout.name}"
                                </button>
                            </div>
                        )}
                    </section>
                )}

                {/* Primary Metrics */}
                <section className="metrics-grid">
                    <Metric
                        value={state.power}
                        label={`Z${powerZone.zone} ${powerZone.name}`}
                        className="metric-watts"
                        color={powerZone.color}
                    />
                    <Metric
                        value={state.cadence}
                        label="Cadence"
                        unit="rpm"
                        className="metric-cadence"
                    />
                    <Metric
                        value={state.hr || '--'}
                        label={state.hr ? `Z${hrZone.zone}` : 'HR'}
                        className="metric-hr"
                        color={state.hr ? hrZone.color : undefined}
                    />
                    <Metric
                        value={formatTime(state.elapsedSeconds)}
                        label="Time"
                        className="metric-time"
                    />
                </section>

                {/* Charts */}
                <section className="charts-section">
                    <div className="chart-container">
                        <PowerChart
                            data={rideRecorder.getRecentData(120)}
                            ftp={state.profile?.ftp || 200}
                        />
                    </div>
                    <div className="chart-container">
                        <HRChart
                            data={rideRecorder.getRecentData(120)}
                            maxHr={state.profile?.maxHr || 180}
                        />
                    </div>
                </section>

                {/* Secondary Metrics */}
                <section className="metrics-secondary">
                    <MetricSmall
                        value={state.speed?.toFixed(1) || '0.0'}
                        label="Speed"
                        unit="km/h"
                    />
                    <MetricSmall
                        value={(state.distance / 1000).toFixed(2)}
                        label="Distance"
                        unit="km"
                    />
                </section>
            </main>

            {/* Ride Summary Modal */}
            {completedRide && (
                <RideSummary
                    rideData={completedRide}
                    profile={state.profile}
                    onClose={() => setCompletedRide(null)}
                />
            )}

            {/* Planned Workout Mode Overlay */}
            {isPlannedWorkoutActive && (
                <PlannedWorkoutMode
                    workout={VO2MAX_TEST_WORKOUT}
                    state={state}
                    onTargetPowerChange={(power) => {
                        if (state.trainerStatus === 'connected') {
                            setTargetPower(power);
                            btSetTargetPower(power);
                        }
                    }}
                    onComplete={() => {
                        console.log('Planned Workout complete!');
                        handleStopRide();
                        setIsPlannedWorkoutActive(false);
                    }}
                    onManualExit={() => setIsPlannedWorkoutActive(false)}
                    onConnectTrainer={handleConnectTrainer}
                    onConnectHRM={handleConnectHRM}
                    onToggleRide={toggleRide}
                    onStopRide={handleStopRide}
                />
            )}
        </div>
    );
}

export default Dashboard;