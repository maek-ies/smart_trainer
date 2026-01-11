import { memo, useCallback, useEffect, useRef, useState } from 'react';
import './WorkoutPlayer.css';

/**
 * WorkoutPlayer - Displays and controls workout step progression
 */
const WorkoutPlayer = memo(function WorkoutPlayer({
    workout,
    isRunning,
    onTargetPowerChange,
    onComplete,
}) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepElapsedSeconds, setStepElapsedSeconds] = useState(0);
    const timerRef = useRef(null);

    const steps = workout?.steps || [];
    const currentStep = steps[currentStepIndex];
    const nextStep = steps[currentStepIndex + 1];

    // Calculate total workout duration
    const totalDuration = steps.reduce((sum, step) => sum + (step.duration || 0), 0);
    const completedDuration = steps
        .slice(0, currentStepIndex)
        .reduce((sum, step) => sum + (step.duration || 0), 0) + stepElapsedSeconds;

    // Timer for step progression
    useEffect(() => {
        if (isRunning && currentStep) {
            timerRef.current = setInterval(() => {
                setStepElapsedSeconds(prev => {
                    const newElapsed = prev + 1;

                    // Check if step is complete
                    if (currentStep.duration && newElapsed >= currentStep.duration) {
                        // Move to next step
                        if (currentStepIndex < steps.length - 1) {
                            setCurrentStepIndex(i => i + 1);
                            return 0;
                        } else {
                            // Workout complete
                            onComplete?.();
                            clearInterval(timerRef.current);
                            return newElapsed;
                        }
                    }
                    return newElapsed;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRunning, currentStepIndex, currentStep, steps.length, onComplete]);

    // Send target power when step changes
    useEffect(() => {
        if (currentStep?.power && onTargetPowerChange) {
            onTargetPowerChange(currentStep.power);
        }
    }, [currentStepIndex, currentStep, onTargetPowerChange]);

    const formatTime = useCallback((seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }, []);

    const getStepRemainingTime = () => {
        if (!currentStep?.duration) return '--:--';
        const remaining = currentStep.duration - stepElapsedSeconds;
        return formatTime(Math.max(0, remaining));
    };

    const getTotalRemainingTime = () => {
        const remaining = totalDuration - completedDuration;
        return formatTime(Math.max(0, remaining));
    };

    const getProgress = () => {
        if (totalDuration === 0) return 0;
        return (completedDuration / totalDuration) * 100;
    };

    if (!workout || steps.length === 0) {
        return null;
    }

    return (
        <div className="workout-player">
            <div className="workout-header">
                <h3 className="workout-name">{workout.name}</h3>
                <div className="workout-progress-bar">
                    <div
                        className="workout-progress-fill"
                        style={{ width: `${getProgress()}%` }}
                    />
                </div>
            </div>

            <div className="current-step">
                <div className="step-power">
                    {currentStep?.power || '--'}
                    <span className="step-power-unit">W</span>
                </div>
                <div className="step-remaining">
                    {getStepRemainingTime()}
                </div>
                {currentStep?.name && (
                    <div className="step-name">{currentStep.name}</div>
                )}
            </div>

            {nextStep && (
                <div className="next-step">
                    <span className="next-label">Next:</span>
                    <span className="next-power">{nextStep.power || '--'}W</span>
                    <span className="next-duration">{formatTime(nextStep.duration || 0)}</span>
                </div>
            )}

            <div className="workout-stats">
                <div className="workout-stat">
                    <span className="stat-value">{currentStepIndex + 1}/{steps.length}</span>
                    <span className="stat-label">Step</span>
                </div>
                <div className="workout-stat">
                    <span className="stat-value">{getTotalRemainingTime()}</span>
                    <span className="stat-label">Remaining</span>
                </div>
            </div>
        </div>
    );
});

export default WorkoutPlayer;
