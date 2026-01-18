import React from 'react';
import './IntervalsSummary.css';

const IntervalsSummary = ({ data, onClose }) => {
    if (!data) return null;

    return (
        <div className="intervals-summary-overlay">
            <div className="intervals-summary-card">
                <div className="summary-header">
                    <h3>Intervals.icu Summary</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="athlete-info">
                    <div className="info-row">
                        <span className="label">Athlete</span>
                        <span className="value">{data.name}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">FTP</span>
                        <span className="value highlight">{data.ftp}w</span>
                    </div>
                    <div className="info-row">
                        <span className="label">Weight</span>
                        <span className="value">{data.weight}kg</span>
                    </div>
                </div>

                <div className="stats-grid">
                    <div className="stat-item">
                        <span className="stat-label">Fitness (CTL)</span>
                        <span className="stat-value">{data.fitness}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Fatigue (ATL)</span>
                        <span className="stat-value">{data.fatigue}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Form (TSB)</span>
                        <span className={`stat-value ${data.form >= 0 ? 'positive' : 'negative'}`}>
                            {data.form}
                        </span>
                    </div>
                </div>

                <div className="connection-status">
                    <span className="status-dot online"></span>
                    Connected successfully
                </div>
            </div>
        </div>
    );
};

export default IntervalsSummary;
