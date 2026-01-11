/**
 * VO2max Test Workout (45 minutes)
 */
export const VO2MAX_TEST_WORKOUT = {
    id: 'vo2max-test',
    name: 'VO2max 5x3 intervals',
    description: '45-minute VO2max session with 5x3min intervals at 120% FTP.',
    steps: [
        // Warmup (10 mins)
        { duration: 300, power: 100, name: 'Warmup Part 1' },
        { duration: 300, power: 150, name: 'Warmup Part 2' },
        
        // Interval 1
        { duration: 180, power: 240, name: 'VO2max Interval 1' }, // 120% of 200W
        { duration: 180, power: 100, name: 'Recovery' },
        
        // Interval 2
        { duration: 180, power: 240, name: 'VO2max Interval 2' },
        { duration: 180, power: 100, name: 'Recovery' },
        
        // Interval 3
        { duration: 180, power: 240, name: 'VO2max Interval 3' },
        { duration: 180, power: 100, name: 'Recovery' },
        
        // Interval 4
        { duration: 180, power: 240, name: 'VO2max Interval 4' },
        { duration: 180, power: 100, name: 'Recovery' },
        
        // Interval 5
        { duration: 180, power: 240, name: 'VO2max Interval 5' },
        { duration: 180, power: 100, name: 'Recovery' },
        
        // Cool down
        { duration: 600, power: 100, name: 'Cool Down' }
    ]
};

/**
 * Get color for a power value based on FTP
 */
export function getZoneColor(power, ftp = 200) {
    const ratio = power / ftp;
    if (ratio < 0.55) return '#808080'; // Z1: Gray
    if (ratio < 0.75) return '#3385ff'; // Z2: Blue
    if (ratio < 0.90) return '#33cc33'; // Z3: Green
    if (ratio < 1.05) return '#ffcc00'; // Z4: Yellow
    if (ratio < 1.20) return '#ff6600'; // Z5: Orange
    return '#ff3300'; // Z6+: Red
}
