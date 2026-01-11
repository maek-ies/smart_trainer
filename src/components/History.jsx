import { useState } from 'react';
import { getRideHistory, deleteRideFromHistory, clearRideHistory } from '../services/rideHistoryService';
import './History.css';

function History({ onBack }) {
    const [history, setHistory] = useState(() => getRideHistory());

    const handleDelete = (id) => {
        if (window.confirm('Delete this ride from history?')) {
            deleteRideFromHistory(id);
            setHistory(getRideHistory());
        }
    };

    const handleClearAll = () => {
        if (window.confirm('Clear ALL ride history? This cannot be undone.')) {
            clearRideHistory();
            setHistory([]);
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
                                <button className="btn-delete" onClick={() => handleDelete(ride.id)}>×</button>
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
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}

export default History;
