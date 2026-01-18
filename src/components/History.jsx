import { useState } from 'react';
import { getRideHistoryForProfile, deleteRideFromHistory, clearRideHistory } from '../services/rideHistoryService';
import { useApp } from '../contexts/AppContext';
import { generateFitFile, downloadFitFile, generateFitFilename } from '../services/fitService';
import './History.css';

function History({ onBack }) {
    const { state } = useApp();
    const [history, setHistory] = useState(() => getRideHistoryForProfile(state.profile?.id));

    const handleDelete = (id) => {
        if (window.confirm('Delete this ride from history?')) {
            deleteRideFromHistory(id);
            setHistory(getRideHistoryForProfile(state.profile?.id));
        }
    };

    const handleClearAll = () => {
        if (window.confirm('Clear ALL your ride history? This cannot be undone.')) {
            // Only clear rides for current profile
            const allHistory = history;
            allHistory.forEach(ride => deleteRideFromHistory(ride.id));
            setHistory([]);
        }
    };

    const handleDownloadFit = (ride) => {
        try {
            // Check if ride has data points
            if (!ride.dataPoints || ride.dataPoints.length === 0) {
                alert('This ride does not have detailed data for FIT export.');
                return;
            }

            // Generate FIT file
            const fitBlob = generateFitFile(ride, state.profile);
            const filename = generateFitFilename(ride.startTime);

            // Download
            downloadFitFile(fitBlob, filename);
        } catch (err) {
            console.error('Failed to download FIT file:', err);
            alert('Failed to generate FIT file. Please try again.');
        }
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (h > 0) {
            return `${h}h ${m}m ${s}s`;
        }
        return `${m}m ${s}s`;
    };

    return (
        <div className="history-view">
            <header className="history-header">
                <button className="btn btn-icon" onClick={onBack}>
                    ←
                </button>
                <h2>Ride History</h2>
                {history.length > 0 && (
                    <button className="btn btn-danger btn-small" onClick={handleClearAll}>
                        Clear All
                    </button>
                )}
            </header>

            <main className="history-list">
                {history.length === 0 ? (
                    <div className="empty-history">
                        <div className="empty-icon">🚲</div>
                        <p>No rides recorded yet.</p>
                        <button className="btn btn-primary" onClick={onBack}>Start Riding</button>
                    </div>
                ) : (
                    history.map(ride => (
                        <div key={ride.id} className="history-item card-elevated">
                            <div className="history-item-header">
                                <span className="history-date">{formatDate(ride.startTime)}</span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() => handleDownloadFit(ride)}
                                        disabled={!ride.dataPoints || ride.dataPoints.length === 0}
                                        title="Download FIT file"
                                    >
                                        💾 FIT
                                    </button>
                                    <button className="btn-delete" onClick={() => handleDelete(ride.id)}>×</button>
                                </div>
                            </div>
                            <div className="history-stats">
                                <div className="history-stat">
                                    <span className="stat-label">Distance</span>
                                    <span className="stat-value">{ride.summary.distance.toFixed(2)} km</span>
                                </div>
                                <div className="history-stat">
                                    <span className="stat-label">Duration</span>
                                    <span className="stat-value">{formatDuration(ride.duration)}</span>
                                </div>
                                <div className="history-stat">
                                    <span className="stat-label">Avg Power</span>
                                    <span className="stat-value">{ride.summary.avgPower} W</span>
                                </div>
                                <div className="history-stat">
                                    <span className="stat-label">Avg HR</span>
                                    <span className="stat-value">{ride.summary.avgHr > 0 ? `${ride.summary.avgHr} bpm` : '--'}</span>
                                </div>
                            </div>

                            {/* Zone Distribution */}
                            {(ride.summary.timeInPowerZones || ride.summary.timeInHrZones) && (
                                <div className="history-zones">
                                    {ride.summary.timeInPowerZones && (
                                        <div className="zone-distribution">
                                            <div className="zone-dist-title">Power Zones</div>
                                            <div className="zone-bars">
                                                {Object.entries(ride.summary.timeInPowerZones).map(([zone, time]) => {
                                                    const percent = (time / ride.duration) * 100;
                                                    if (percent < 1) return null;
                                                    return (
                                                        <div
                                                            key={zone}
                                                            className={`zone-bar zone-${zone}`}
                                                            style={{ width: `${percent}%` }}
                                                            title={`Z${zone}: ${Math.round(percent)}%`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    {ride.summary.timeInHrZones && (
                                        <div className="zone-distribution">
                                            <div className="zone-dist-title">HR Zones</div>
                                            <div className="zone-bars">
                                                {Object.entries(ride.summary.timeInHrZones).map(([zone, time]) => {
                                                    const percent = (time / ride.duration) * 100;
                                                    if (percent < 1) return null;
                                                    return (
                                                        <div
                                                            key={zone}
                                                            className={`zone-bar hr-zone-${zone}`}
                                                            style={{ width: `${percent}%` }}
                                                            title={`Z${zone}: ${Math.round(percent)}%`}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}

export default History;
