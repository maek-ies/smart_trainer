// Zone Service - Calculates power and HR zones

/**
 * Power Zones (Coggan)
 * Returns zone number (1-6) and zone color
 */
export function getPowerZone(watts, ftp) {
    if (!ftp || ftp <= 0) return { zone: 0, color: 'var(--zone-1)', name: 'N/A' };

    const percent = (watts / ftp) * 100;

    if (percent < 56) return { zone: 1, color: 'var(--zone-1)', name: 'Recovery' };
    if (percent < 76) return { zone: 2, color: 'var(--zone-2)', name: 'Endurance' };
    if (percent < 91) return { zone: 3, color: 'var(--zone-3)', name: 'Tempo' };
    if (percent < 106) return { zone: 4, color: 'var(--zone-4)', name: 'Threshold' };
    if (percent < 121) return { zone: 5, color: 'var(--zone-5)', name: 'VO2max' };
    if (percent < 151) return { zone: 6, color: 'var(--zone-6)', name: 'Anaerobic' };
    return { zone: 7, color: 'var(--zone-7)', name: 'Neuromuscular' };
}

/**
 * Heart Rate Zones
 * Returns zone number (1-5) and zone color
 */
export function getHRZone(hr, maxHr) {
    if (!maxHr || maxHr <= 0) return { zone: 0, color: 'var(--hr-zone-1)', name: 'N/A' };

    const percent = (hr / maxHr) * 100;

    if (percent < 60) return { zone: 1, color: 'var(--hr-zone-1)', name: 'Recovery' };
    if (percent < 70) return { zone: 2, color: 'var(--hr-zone-2)', name: 'Easy' };
    if (percent < 80) return { zone: 3, color: 'var(--hr-zone-3)', name: 'Aerobic' };
    if (percent < 90) return { zone: 4, color: 'var(--hr-zone-4)', name: 'Threshold' };
    return { zone: 5, color: 'var(--hr-zone-5)', name: 'Max' };
}

/**
 * Get all power zone boundaries for chart coloring
 */
export function getPowerZoneBoundaries(ftp) {
    if (!ftp) return [];
    return [
        { maxPercent: 55, color: 'var(--zone-1)' },
        { maxPercent: 75, color: 'var(--zone-2)' },
        { maxPercent: 90, color: 'var(--zone-3)' },
        { maxPercent: 105, color: 'var(--zone-4)' },
        { maxPercent: 120, color: 'var(--zone-5)' },
        { maxPercent: 150, color: 'var(--zone-6)' },
        { maxPercent: Infinity, color: 'var(--zone-7)' },
    ].map(z => ({ ...z, maxWatts: Math.round(ftp * z.maxPercent / 100) }));
}

/**
 * Get all HR zone boundaries for chart coloring
 */
export function getHRZoneBoundaries(maxHr) {
    if (!maxHr) return [];
    return [
        { maxPercent: 60, color: 'var(--hr-zone-1)' },
        { maxPercent: 70, color: 'var(--hr-zone-2)' },
        { maxPercent: 80, color: 'var(--hr-zone-3)' },
        { maxPercent: 90, color: 'var(--hr-zone-4)' },
        { maxPercent: 100, color: 'var(--hr-zone-5)' },
    ].map(z => ({ ...z, maxHr: Math.round(maxHr * z.maxPercent / 100) }));
}
