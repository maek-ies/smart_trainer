import React from 'react';
import CompactWorkoutChart from './CompactWorkoutChart';
import './IntervalsSummary.css';

const IntervalsSummary = ({ data, onClose }) => {
    const [selectedActivity, setSelectedActivity] = React.useState(null);

    if (!data) return null;

    const round = (val) => typeof val === 'number' ? Math.round(val) : val;
    const formatDuration = (seconds) => {
        if (!seconds) return '0m';
        const mins = Math.floor(seconds / 60);
        return `${mins}m`;
    };

    return (
        <div className="intervals-summary-overlay">
            <div className="intervals-summary-card">
                <div className="summary-header">
                    <h3>{selectedActivity ? 'Workout Detail' : 'Intervals.icu Summary'}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {!selectedActivity ? (
                    <>
                        <div className="athlete-info">
                            <div className="info-row">
                                <span className="label">Athlete</span>
                                <span className="value">{data.name}</span>
                            </div>
                            <div className="info-grid">
                                <div className="info-row">
                                    <span className="label">FTP</span>
                                    <span className="value highlight">{round(data.ftp)}w</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">eFTP</span>
                                    <span className="value highlight-alt">{round(data.eFTP)}w</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Weight</span>
                                    <span className="value">{round(data.weight)}kg</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">ACWR</span>
                                    <span className={`value ${data.acwr > 1.3 ? 'negative' : data.acwr < 0.8 ? 'warning' : 'positive'}`}>
                                        {data.acwr?.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="stats-grid">
                            <div className="stat-item">
                                <span className="stat-label">Fitness (CTL)</span>
                                <span className="stat-value">{round(data.fitness)}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Fatigue (ATL)</span>
                                <span className="stat-value">{round(data.fatigue)}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Form (TSB)</span>
                                <span className={`stat-value ${data.form >= 0 ? 'positive' : 'negative'}`}>
                                    {round(data.form)}
                                </span>
                            </div>
                        </div>

                        {data.upcomingActivities && data.upcomingActivities.length > 0 && (
                            <div className="upcoming-section">
                                <h4>Planned (Next 3 Days)</h4>
                                <div className="upcoming-list">
                                    {data.upcomingActivities.map(activity => (
                                        <div
                                            key={activity.id}
                                            className="upcoming-item clickable"
                                            onClick={() => setSelectedActivity(activity)}
                                        >
                                            <div className="activity-header-row">
                                                <span className="activity-date-inline">
                                                    {new Date(activity.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                                                </span>
                                                <span className="activity-name">{activity.name}</span>
                                                <div className="activity-stats">
                                                    <span>{formatDuration(activity.duration)}</span>
                                                    <span>{round(activity.load)} load</span>
                                                    <span>{round(activity.intensity)}%</span>
                                                </div>
                                            </div>
                                            <CompactWorkoutChart steps={activity.steps} ftp={data.ftp} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="workout-detail-view">
                        <div className="detail-header">
                            <button className="back-btn" onClick={() => setSelectedActivity(null)}>← Back to Summary</button>
                            <h4>{selectedActivity.name}</h4>
                        </div>

                        <div className="detail-stats">
                            <div className="detail-stat">
                                <span className="label">Duration</span>
                                <span className="value">{formatDuration(selectedActivity.duration)}</span>
                            </div>
                            <div className="detail-stat">
                                <span className="label">Load</span>
                                <span className="value">{round(selectedActivity.load)}</span>
                            </div>
                            <div className="detail-stat">
                                <span className="label">Intensity</span>
                                <span className="value">{round(selectedActivity.intensity)}%</span>
                            </div>
                        </div>

                        <div className="detail-chart-wrapper">
                            <CompactWorkoutChart steps={selectedActivity.steps} ftp={data.ftp} />
                        </div>

                        {selectedActivity.description && (
                            <div className="detail-description">
                                <h5>Workout Description</h5>
                                <pre className="description-text">{selectedActivity.description}</pre>
                            </div>
                        )}
                        {!selectedActivity.description && selectedActivity.steps.length === 0 && (
                            <div className="no-details">No further details available for this activity.</div>
                        )}
                    </div>
                )}

                <div className="connection-status">
                    <span className="status-dot online"></span>
                    Connected successfully
                </div>
            </div>
        </div>
    );
};

export default IntervalsSummary;
