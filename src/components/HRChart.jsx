import { memo, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    ResponsiveContainer,
    ReferenceLine,
    Tooltip,
    CartesianGrid
} from 'recharts';
import { getHRZoneBoundaries } from '../services/zoneService';

const HRTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="card" style={{ padding: '8px 12px', border: '1px solid var(--glass-highlight)', backdropFilter: 'blur(8px)', background: 'rgba(15, 16, 32, 0.8)' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--color-hr)' }}>
                    {`${payload[0].value} BPM`}
                </p>
            </div>
        );
    }
    return null;
};

const HRChart = memo(function HRChart({ data, maxHr }) {
    // Get zone boundaries
    const zones = useMemo(() => getHRZoneBoundaries(maxHr), [maxHr]);

    // Transform data for chart
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            return [{ time: 0, hr: 0 }];
        }

        const startTime = data[0]?.timestamp || 0;
        return data.map(point => ({
            time: Math.round((point.timestamp - startTime) / 1000),
            hr: point.hr || 0,
        }));
    }, [data]);

    // Dynamic Y-axis
    const [yMin, yMax] = useMemo(() => {
        const validHRs = chartData.filter(d => d.hr > 0).map(d => d.hr);
        if (validHRs.length === 0) return [60, maxHr];

        const min = Math.floor(Math.min(...validHRs) / 10) * 10;
        const max = Math.ceil(Math.max(...validHRs, maxHr * 0.9) / 10) * 10;
        return [Math.max(40, min - 10), max];
    }, [chartData, maxHr]);

    // Color based on current HR
    const currentHR = chartData[chartData.length - 1]?.hr || 0;
    const currentZone = zones.find(z => currentHR <= z.maxHr) || zones[zones.length - 1];
    const strokeColor = currentZone?.color || 'var(--color-hr)';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-hr)" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="var(--color-hr)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--color-hr)" stopOpacity={0} />
                    </linearGradient>
                    <filter id="hrGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                />

                <XAxis
                    dataKey="time"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(seconds) => {
                        const m = Math.floor(seconds / 60);
                        const s = seconds % 60;
                        return `${m}:${s.toString().padStart(2, '0')}`;
                    }}
                />

                <YAxis
                    domain={[yMin, yMax]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                />

                <Tooltip content={<HRTooltip />} />

                {/* Zone thresholds */}
                {zones.slice(0, -1).map((zone, i) => (
                    <ReferenceLine
                        key={i}
                        y={zone.maxHr}
                        stroke={zone.color}
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        strokeOpacity={0.3}
                    />
                ))}

                <Area
                    type="monotone"
                    dataKey="hr"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    fill="url(#hrGradient)"
                    isAnimationActive={true}
                    animationDuration={500}
                    filter="url(#hrGlow)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
});

export default HRChart;
