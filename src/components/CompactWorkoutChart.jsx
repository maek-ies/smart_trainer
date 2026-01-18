import React from 'react';
import './CompactWorkoutChart.css';

const CompactWorkoutChart = ({ steps, ftp, height = '28px' }) => {
    if (!steps || steps.length === 0) {
        return <div className="no-steps-placeholder" style={{ height }}></div>;
    }

    // Flatten nested steps (like repeats)
    const flatSteps = [];
    const processStep = (step) => {
        if (step.steps) {
            const reps = step.reps || 1;
            for (let i = 0; i < reps; i++) {
                step.steps.forEach(s => processStep(s));
            }
        } else {
            flatSteps.push(step);
        }
    };
    steps.forEach(s => processStep(s));

    const totalDuration = flatSteps.reduce((acc, s) => acc + (s.duration || 0), 0);
    if (totalDuration === 0) return null;

    let currentX = 0;
    const getColor = (pct) => {
        if (pct >= 151) return '#d1d8e0'; // Z7 (Neuromuscular)
        if (pct >= 121) return '#9b59b6'; // Z6 (Anaerobic)
        if (pct >= 106) return '#ee4266'; // Z5 (VO2 Max)
        if (pct >= 91) return '#ff9f43';  // Z4 (Threshold)
        if (pct >= 76) return '#f9e160';  // Z3 (Tempo)
        if (pct >= 56) return '#3dbb5d';  // Z2 (Endurance)
        return '#45b5a9'; // Z1 (Active Recovery)
    };

    return (
        <svg
            className="compact-workout-chart"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ height }}
        >
            {flatSteps.map((step, idx) => {
                const width = ((step.duration || 0) / totalDuration) * 100;

                const startRaw = step.power?.start ?? step.power?.value ?? 0;
                const endRaw = step.power?.end ?? step.power?.value ?? 0;
                const units = step.power?.units;

                // Normalization: Only divide by FTP if units are specifically 'w'
                // or if it's clearly absolute watts (value > 150 and > ftp*0.4)
                let startPct, endPct;
                if (units === 'w' || (startRaw > 150 && ftp && startRaw > ftp * 0.4)) {
                    startPct = ftp ? (startRaw / ftp) * 100 : startRaw;
                    endPct = ftp ? (endRaw / ftp) * 100 : endRaw;
                } else {
                    startPct = startRaw;
                    endPct = endRaw;
                }

                const avgPct = (startPct + endPct) / 2;
                const color = getColor(avgPct);

                // Scale height: 160% FTP is "full" height
                const hStart = Math.min(98, (startPct / 160) * 100);
                const hEnd = Math.min(98, (endPct / 160) * 100);

                const x1 = currentX;
                const x2 = currentX + width;
                const y1 = 100 - hStart;
                const y2 = 100 - hEnd;

                const points = `${x1},100 ${x2},100 ${x2},${y2} ${x1},${y1}`;
                currentX += width;

                return (
                    <polygon
                        key={idx}
                        points={points}
                        fill={color}
                        opacity="0.9"
                        stroke={color}
                        strokeWidth="0.1"
                    />
                );
            })}
            <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        </svg>
    );
};

export default CompactWorkoutChart;
