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
import { getPowerZoneBoundaries } from '../services/zoneService';

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="card" style={{ padding: '8px 12px', border: '1px solid var(--glass-highlight)', backdropFilter: 'blur(8px)', background: 'rgba(15, 16, 32, 0.8)' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--color-watts)' }}>
                    {`${payload[0].value} W`}
                </p>
            </div>
        );
    }
    return null;
};

const PowerChart = memo(function PowerChart({ data, ftp }) {
    // Get zone boundaries
    const zones = useMemo(() => getPowerZoneBoundaries(ftp), [ftp]);

    // Transform data for chart
    const chartData = useMemo(() => {
        if (!data || data.length === 0) {
            return [{ time: 0, power: 0 }];
        }

        const startTime = data[0]?.timestamp || 0;
        return data.map(point => ({
            time: Math.round((point.timestamp - startTime) / 1000),
            power: point.power || 0,
        }));
    }, [data]);

    // Dynamic Y-axis max
    const yMax = useMemo(() => {
        const maxPower = Math.max(...chartData.map(d => d.power), ftp * 1.2);
        return Math.ceil(maxPower / 50) * 50; // Round up to nearest 50
    }, [chartData, ftp]);

    // Color based on current power
    const currentPower = chartData[chartData.length - 1]?.power || 0;
    const currentZone = zones.find(z => currentPower <= z.maxWatts) || zones[zones.length - 1];
    const strokeColor = currentZone?.color || 'var(--color-watts)';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-watts)" stopOpacity={0.4} />
                        <stop offset="50%" stopColor="var(--color-watts)" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="var(--color-watts)" stopOpacity={0} />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
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
                    domain={[0, yMax]}
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 9, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={45}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* FTP Reference Line */}
                <ReferenceLine
                    y={ftp}
                    stroke="var(--zone-4)"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    strokeOpacity={0.6}
                    label={{
                        value: 'FTP',
                        position: 'right',
                        fill: 'var(--zone-4)',
                        fontSize: 8,
                        fontWeight: 700,
                        offset: 10
                    }}
                />

                <Area
                    type="monotone"
                    dataKey="power"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    fill="url(#powerGradient)"
                    isAnimationActive={true}
                    animationDuration={500}
                    filter="url(#glow)"
                />
            </AreaChart>
        </ResponsiveContainer>
    );
});

export default PowerChart;
