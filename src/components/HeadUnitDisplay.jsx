import { memo } from 'react';
import './HeadUnitDisplay.css';

const HeadUnitDisplay = memo(({
    power,
    hr,
    cadence,
    targetPower,
    remainingStepTime,
    totalRemainingTime,
    progress,
    speed,
    distance,
    powerColor,
    hrColor,
    isWahoo = false // Placeholder for protocol specific tweaks
}) => {
    return (
        <div className="head-unit-display">
            {/* Top Timer */}
            <div className="interval-timer-box">
                {remainingStepTime}
            </div>

            {/* The Pill */}
            <div className="pill-container">
                <div className="pill-metric pill-hr">
                    <span className="pill-icon">♥</span>
                    <span className="pill-value" style={{ color: hrColor }}>{hr || 0}</span>
                </div>

                <div className="pill-metric pill-power">
                    <span className="pill-icon">⚡</span>
                    <span className="pill-value" style={{ color: powerColor }}>
                        {power}
                        <span className="power-trend">▼</span>
                    </span>
                </div>

                <div className="pill-metric pill-cadence">
                    <span className="pill-icon">↻</span>
                    <span className="pill-value">{cadence || 0}</span>
                </div>

                {/* Outside Right Timer */}
                <div className="total-timer-label">
                    {totalRemainingTime}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="pill-progress-container">
                <div className="pill-progress-bg">
                    <div
                        className="pill-progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="pill-secondary-metrics">
                <div className="secondary-item">
                    <span className="sec-icon">🚲</span>
                    <span className="sec-value">{speed?.toFixed(1) || '0.0'}</span>
                    <span className="sec-unit">km/h</span>
                </div>
                <div className="secondary-item">
                    <span className="sec-value">{(power / 75).toFixed(1)}</span>
                    <span className="sec-unit">W/kg</span>
                </div>
                <div className="secondary-item">
                    <span className="sec-icon">🏁</span>
                    <span className="sec-value">{(distance / 1000).toFixed(2)}</span>
                    <span className="sec-unit">km</span>
                </div>
            </div>
        </div>
    );
});

export default HeadUnitDisplay;
