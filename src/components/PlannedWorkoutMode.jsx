import { useState, useEffect, useRef, useCallback } from 'react';
import WorkoutIntervalsList from './WorkoutIntervalsList';
import HeadUnitDisplay from './HeadUnitDisplay';
import PowerChart from './PowerChart';
import HRChart from './HRChart';
import rideRecorder from '../services/rideRecorder';
import { getZoneColor } from '../services/workoutService';
import { getHRZone } from '../services/zoneService';
import './PlannedWorkoutMode.css';

const PlannedWorkoutMode = ({
    workout,
    state,
    onTargetPowerChange,
    onComplete,
    onManualExit,
    onConnectTrainer,
    onConnectHRM,
    onToggleRide,
    onStopRide
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepElapsedSeconds, setStepElapsedSeconds] = useState(0);
    const timerRef = useRef(null);

    const steps = workout?.steps || [];
    const currentStep = steps[currentStepIndex];

    // Calculate total workout stats
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);
    const completedWorkoutSeconds = steps.slice(0, currentStepIndex).reduce((sum, s) => sum + s.duration, 0) + stepElapsedSeconds;
    const totalRemaining = totalDuration - completedWorkoutSeconds;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const skipStep = useCallback(() => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(i => i + 1);
            setStepElapsedSeconds(0);
        } else {
            onComplete?.();
        }
    }, [currentStepIndex, steps.length, onComplete]);

    // Timer logic
    useEffect(() => {
        if (state.isRiding && !state.isPaused && currentStep) {
            timerRef.current = setInterval(() => {
                setStepElapsedSeconds(prev => {
                    const next = prev + 1;
                    if (next >= currentStep.duration) {
                        if (currentStepIndex < steps.length - 1) {
                            setCurrentStepIndex(i => i + 1);
                            return 0;
                        } else {
                            onComplete?.();
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
    }, [state.isRiding, state.isPaused, currentStepIndex, currentStep, steps.length, onComplete]);

    // Send target power updates
    useEffect(() => {
        if (currentStep && onTargetPowerChange) {
            onTargetPowerChange(currentStep.power);
        }
    }, [currentStepIndex, currentStep, onTargetPowerChange]);

    const powerZone = getZoneColor(state.power, state.profile?.ftp);
    const hrZone = getHRZone(state.hr, state.profile?.maxHr);

    return (
        <div className="planned-workout-mode">
            <header className="dashboard-header compact planned-header">
                <div className="header-left">
                    <button className="btn btn-secondary btn-small" onClick={onManualExit}>
                        ✕ Exit
                    </button>
                    <h3 className="header-title">{state.profile?.name}</h3>
                </div>

                <div className="header-center">
                    <div className="ride-controls">
                        {!state.isRiding ? (
                            <button className="btn btn-start btn-small" onClick={onToggleRide}>
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

            <div className="workout-layout">
                {/* Left Side: Intervals List */}
                <div className="lhs-panel">
                    <WorkoutIntervalsList
                        steps={steps}
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
                        targetPower={currentStep?.power}
                        remainingStepTime={formatTime(currentStep?.duration - stepElapsedSeconds)}
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
        </div>
    );
};

export default PlannedWorkoutMode;
