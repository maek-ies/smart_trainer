import { useRef, useEffect } from 'react';
import './WorkoutIntervalsList.css';
import { getZoneColor } from '../services/workoutService';

const WorkoutIntervalsList = ({ steps, currentStepIndex, ftp }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const currentItem = containerRef.current?.children[currentStepIndex];
        if (currentItem) {
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStepIndex]);

    const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (secs === 0) return `${mins} min`;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="workout-intervals-list" ref={containerRef}>
            {steps.map((step, index) => {
                const isCurrent = index === currentStepIndex;
                const isPast = index < currentStepIndex;
                const zoneColor = getZoneColor(step.power, ftp);

                return (
                    <div
                        key={index}
                        className={`interval-item ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
                        style={{ '--zone-color': zoneColor }}
                    >
                        <div className="interval-status">
                            <span className="star-icon">★</span>
                        </div>
                        <div className="interval-power">
                            {step.power} W
                        </div>
                        <div className="interval-duration">
                            {formatDuration(step.duration)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default WorkoutIntervalsList;
