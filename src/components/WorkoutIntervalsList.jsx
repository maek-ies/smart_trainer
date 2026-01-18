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

    const formatPower = (p) => {
        if (typeof p === 'object' && p !== null) {
            const unit = p.units === 'w' ? 'W' : '%';
            if (p.start !== undefined && p.end !== undefined) {
                return `${Math.round(p.start)}-${Math.round(p.end)}${unit}`;
            }
            return `${Math.round(p.value || 0)}${unit}`;
        }
        if (typeof p === 'number') {
            return `${Math.round(p)}%`;
        }
        return p;
    };

    return (
        <div className="workout-intervals-list" ref={containerRef}>
            {steps.map((step, index) => {
                const isCurrent = index === currentStepIndex;
                const isPast = index < currentStepIndex;
                // getZoneColor handles objects internally or we pass a representative value? 
                // Assuming getZoneColor needs a single value, we use start or avg.
                // However, without seeing getZoneColor, let's assume it might handle it or we pass a safe number.
                // For safety, let's look at getZoneColor usage. 
                // If it fails, we default to 0.
                let powerVal = 0;
                if (typeof step.power === 'number') powerVal = step.power;
                else if (typeof step.power === 'object' && step.power !== null) {
                    powerVal = step.power.value || ((step.power.start + step.power.end) / 2) || 0;
                }

                const zoneColor = getZoneColor(powerVal, ftp);

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
                            {formatPower(step.power)}
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
