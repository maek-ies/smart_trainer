import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import WorkoutIntervalsList from './WorkoutIntervalsList';
import HeadUnitDisplay from './HeadUnitDisplay';
import PowerChart from './PowerChart';
import HRChart from './HRChart';
import CompactWorkoutChart from './CompactWorkoutChart';
import rideRecorder from '../services/rideRecorder';
import { getZoneColor } from '../services/workoutService';
import { getHRZone } from '../services/zoneService';
import './PlannedWorkoutMode.css';

const PlannedWorkoutMode = ({
    upcomingWorkouts = [],
    state,
    onTargetPowerChange,
    onComplete,
    onManualExit,
    onConnectTrainer,
    onConnectHRM,
    onToggleRide,
    onStopRide
}) => {
    const [activeTab, setActiveTab] = useState('select'); // 'select' | 'train'
    const [selectedWorkout, setSelectedWorkout] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepElapsedSeconds, setStepElapsedSeconds] = useState(0);
    const timerRef = useRef(null);

    // Refs for callbacks to avoid dependency cycles/resets
    const onCompleteRef = useRef(onComplete);
    const onTargetPowerChangeRef = useRef(onTargetPowerChange);

    useEffect(() => {
        onCompleteRef.current = onComplete;
        onTargetPowerChangeRef.current = onTargetPowerChange;
    }, [onComplete, onTargetPowerChange]);

    // Filter to get up to 3 upcoming workouts
    const workoutOptions = useMemo(() => upcomingWorkouts.slice(0, 3), [upcomingWorkouts]);

    // Default selection to today's workout if available
    useEffect(() => {
        if (workoutOptions.length > 0 && !selectedWorkout) {
            setSelectedWorkout(workoutOptions[0]);
        }
    }, [workoutOptions, selectedWorkout]);

    const steps = useMemo(() => selectedWorkout?.steps || [], [selectedWorkout]);
    const currentStep = steps[currentStepIndex];

    // Calculate total workout stats
    const totalDuration = useMemo(() => steps.reduce((sum, s) => {
        if (s.steps) {
            return sum + (s.reps || 1) * s.steps.reduce((subSum, ss) => subSum + ss.duration, 0);
        }
        return sum + s.duration;
    }, 0), [steps]);

    const flatSteps = useMemo(() => {
        const flat = [];
        const process = (s) => {
            if (s.steps) {
                for (let i = 0; i < (s.reps || 1); i++) {
                    s.steps.forEach(ss => process(ss));
                }
            } else {
                flat.push(s);
            }
        };
        steps.forEach(s => process(s));
        return flat;
    }, [steps]);

    const activeStep = flatSteps[currentStepIndex];

    const completedWorkoutSeconds = flatSteps.slice(0, currentStepIndex).reduce((sum, s) => sum + s.duration, 0) + stepElapsedSeconds;
    const totalRemaining = totalDuration - completedWorkoutSeconds;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const skipStep = useCallback(() => {
        if (currentStepIndex < flatSteps.length - 1) {
            setCurrentStepIndex(i => i + 1);
            setStepElapsedSeconds(0);
        } else {
            onCompleteRef.current?.();
        }
    }, [currentStepIndex, flatSteps.length]);

    // Timer logic
    useEffect(() => {
        if (state.isRiding && !state.isPaused && activeStep && activeTab === 'train') {
            timerRef.current = setInterval(() => {
                setStepElapsedSeconds(prev => {
                    const next = prev + 1;
                    if (next >= activeStep.duration) {
                        if (currentStepIndex < flatSteps.length - 1) {
                            setCurrentStepIndex(i => i + 1);
                            return 0;
                        } else {
                            onCompleteRef.current?.();
                            clearInterval(timerRef.current);
                            return next;
                        }
                    }
                    return next;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [state.isRiding, state.isPaused, activeStep, activeTab, currentStepIndex, flatSteps.length]); // Intentionally removed onComplete

    // Send target power updates
    useEffect(() => {
        if (activeStep && activeTab === 'train') {
            onTargetPowerChangeRef.current?.(activeStep.power);
        }
    }, [currentStepIndex, activeStep, activeTab]); // Intentionally removed onTargetPowerChange

    const powerZone = getZoneColor(state.power, state.profile?.ftp);
    const hrZone = getHRZone(state.hr, state.profile?.maxHr);

    const handleSelectWorkout = (workout) => {
        setSelectedWorkout(workout);
        setCurrentStepIndex(0);
        setStepElapsedSeconds(0);
        setActiveTab('train');
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    return (
        <div className="planned-workout-mode">
            <header className="dashboard-header compact planned-header">
                <div className="header-left">
                    <button className="btn btn-secondary btn-small" onClick={onManualExit}>
                        ✕ Exit
                    </button>
                    <div className="planned-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'select' ? 'active' : ''}`}
                            onClick={() => setActiveTab('select')}
                        >
                            Plans
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'train' ? 'active' : ''}`}
                            onClick={() => setActiveTab('train')}
                            disabled={!selectedWorkout}
                        >
                            Train
                        </button>
                    </div>
                </div>

                <div className="header-center">
                    <div className="ride-controls">
                        {!state.isRiding ? (
                            <button
                                className="btn btn-start btn-small"
                                onClick={() => {
                                    if (activeTab !== 'train') setActiveTab('train');
                                    onToggleRide();
                                }}
                                disabled={!selectedWorkout}
                            >
                                ▶ Start
                            </button>
                        ) : (
                            <>
                                <button
                                    className={`btn btn-small ${state.isPaused ? 'btn-start' : 'btn-secondary'}`}
                                    onClick={onToggleRide}
                                >
                                    {state.isPaused ? '▶ Resume' : '⏸ Pause'}
                                </button>
                                <button className="btn btn-stop btn-small" onClick={onStopRide}>
                                    Stop
                                </button>
                                <button className="btn btn-secondary btn-small" onClick={skipStep} title="Skip Step">
                                    ⏭ Skip
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        className={`btn btn-xsmall btn-connect-status ${state.trainerStatus}`}
                        onClick={onConnectTrainer}
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
                            onClick={onConnectTrainer}
                        />
                        <span
                            className={`connection-dot ${state.hrmStatus}`}
                            title={state.hrmName || 'HRM'}
                            onClick={onConnectHRM}
                        />
                    </div>
                </div>
            </header>

            <div className="workout-content-area">
                {activeTab === 'select' ? (
                    <div className="plan-selection-view">
                        <h3>Choose a Workout</h3>
                        <div className="upcoming-list planned-selection-list">
                            {workoutOptions.length > 0 ? (
                                workoutOptions.map(workout => (
                                    <div
                                        key={workout.id}
                                        className={`upcoming-item planned-item ${selectedWorkout?.id === workout.id ? 'selected' : ''}`}
                                        onClick={() => handleSelectWorkout(workout)}
                                    >
                                        <div className="activity-header-row">
                                            <span className="activity-date-inline">{workout.date ? new Date(workout.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) : 'Today'}</span>
                                            <span className="activity-name">{workout.name}</span>
                                            <div className="activity-stats">
                                                <span>{formatDuration(workout.duration)}</span>
                                                <span title="Training Load">⚡{workout.load}</span>
                                                <span title="Intensity">🔥{Math.round(workout.intensity)}%</span>
                                            </div>
                                        </div>
                                        <CompactWorkoutChart
                                            steps={workout.steps}
                                            ftp={state.profile?.ftp || 200}
                                            height="32px"
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="no-workouts">
                                    <p>No upcoming workouts found on Intervals.icu.</p>
                                    <button className="btn btn-secondary" onClick={onManualExit}>Back</button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="workout-layout">
                        {/* Left Side: Intervals List */}
                        <div className="lhs-panel">
                            <WorkoutIntervalsList
                                steps={flatSteps}
                                currentStepIndex={currentStepIndex}
                                ftp={state.profile?.ftp || 200}
                            />
                        </div>

                        {/* Center Panel: Metrics */}
                        <div className="center-panel">
                            <HeadUnitDisplay
                                power={state.power}
                                hr={state.hr}
                                cadence={state.cadence}
                                targetPower={activeStep?.power}
                                remainingStepTime={formatTime(activeStep?.duration - stepElapsedSeconds)}
                                totalRemainingTime={formatTime(totalRemaining)}
                                progress={(completedWorkoutSeconds / totalDuration) * 100}
                                speed={state.speed}
                                distance={state.distance}
                                powerColor={powerZone}
                                hrColor={hrZone.color}
                            />
                        </div>

                        {/* Right Panel: Charts */}
                        <div className="rhs-panel-charts">
                            <div className="mini-chart">
                                <PowerChart
                                    data={rideRecorder.getFullSessionData()}
                                    ftp={state.profile?.ftp || 200}
                                />
                            </div>
                            <div className="mini-chart">
                                <HRChart
                                    data={rideRecorder.getFullSessionData()}
                                    maxHr={state.profile?.maxHr || 180}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlannedWorkoutMode;
