import { memo, useState } from 'react';
import { generateFitFile, downloadFitFile, generateFitFilename } from '../services/fitService';
import { uploadActivity, isIntervalsConfigured } from '../services/intervalsService';
import './RideSummary.css';

const RideSummary = memo(function RideSummary({ rideData, profile, onClose }) {
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle | uploading | success | error
    const [uploadError, setUploadError] = useState(null);

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleDownloadFit = () => {
        try {
            const fitBlob = generateFitFile(rideData, profile);
            const filename = generateFitFilename(rideData.startTime);
            downloadFitFile(fitBlob, filename);
        } catch (err) {
            console.error('Failed to generate FIT file:', err);
            alert('Failed to generate FIT file. Please try again.');
        }
    };

    const handleUploadToIntervals = async () => {
        setUploadStatus('uploading');
        setUploadError(null);

        try {
            const fitBlob = generateFitFile(rideData, profile);
            const filename = generateFitFilename(rideData.startTime);
            await uploadActivity(fitBlob, filename, profile);
            setUploadStatus('success');
        } catch (err) {
            console.error('Failed to upload to Intervals.icu:', err);
            setUploadError(err.message);
            setUploadStatus('error');
        }
    };

    const duration = Math.floor(rideData.duration / 1000);
    const hasHRData = rideData.summary.avgHr > 0;
    const hasRRData = rideData.rrIntervals && rideData.rrIntervals.length > 0;
    const canUpload = isIntervalsConfigured(profile);

    return (
        <div className="ride-summary-overlay" onClick={onClose}>
            <div className="ride-summary-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ride-summary-header">
                    <h2>🎉 Ride Complete!</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="ride-summary-content">
                    {/* Duration */}
                    <div className="summary-stat-large">
                        <div className="stat-value">{formatTime(duration)}</div>
                        <div className="stat-label">Duration</div>
                    </div>

                    {/* Stats Grid */}
                    <div className="summary-stats-grid">
                        <div className="summary-stat">
                            <div className="stat-value">{rideData.summary.avgPower}</div>
                            <div className="stat-label">Avg Power (W)</div>
                        </div>
                        <div className="summary-stat">
                            <div className="stat-value">{rideData.summary.maxPower}</div>
                            <div className="stat-label">Max Power (W)</div>
                        </div>
                        <div className="summary-stat">
                            <div className="stat-value">{rideData.summary.avgCadence}</div>
                            <div className="stat-label">Avg Cadence</div>
                        </div>
                        <div className="summary-stat">
                            <div className="stat-value">{rideData.summary.distance.toFixed(2)}</div>
                            <div className="stat-label">Distance (km)</div>
                        </div>
                        {hasHRData && (
                            <>
                                <div className="summary-stat">
                                    <div className="stat-value">{rideData.summary.avgHr}</div>
                                    <div className="stat-label">Avg HR</div>
                                </div>
                                <div className="summary-stat">
                                    <div className="stat-value">{rideData.summary.maxHr}</div>
                                    <div className="stat-label">Max HR</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Zone Distribution */}
                    {(rideData.summary.timeInPowerZones || rideData.summary.timeInHrZones) && (
                        <div className="summary-zones">
                            {rideData.summary.timeInPowerZones && (
                                <div className="zone-distribution">
                                    <div className="zone-dist-title">Power Zone Distribution</div>
                                    <div className="zone-bars">
                                        {Object.entries(rideData.summary.timeInPowerZones).map(([zone, time]) => {
                                            const percent = (time / rideData.duration) * 100;
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
                                    <div className="zone-labels-grid">
                                        {Object.entries(rideData.summary.timeInPowerZones).map(([zone, time]) => {
                                            const percent = (time / rideData.duration) * 100;
                                            if (percent < 2) return null;
                                            return (
                                                <div key={zone} className="zone-label-item">
                                                    <span className={`zone-dot zone-${zone}`}></span>
                                                    <span className="zone-label-text">Z{zone}: {Math.round(percent)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {rideData.summary.timeInHrZones && (
                                <div className="zone-distribution">
                                    <div className="zone-dist-title">HR Zone Distribution</div>
                                    <div className="zone-bars">
                                        {Object.entries(rideData.summary.timeInHrZones).map(([zone, time]) => {
                                            const percent = (time / rideData.duration) * 100;
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
                                    <div className="zone-labels-grid">
                                        {Object.entries(rideData.summary.timeInHrZones).map(([zone, time]) => {
                                            const percent = (time / rideData.duration) * 100;
                                            if (percent < 2) return null;
                                            return (
                                                <div key={zone} className="zone-label-item">
                                                    <span className={`zone-dot hr-zone-${zone}`}></span>
                                                    <span className="zone-label-text">Z{zone}: {Math.round(percent)}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* HRV Data Badge */}
                    {hasRRData && (
                        <div className="hrv-badge">
                            ✓ Includes {rideData.rrIntervals.length} RR intervals (HRV data)
                        </div>
                    )}

                    {/* Upload Status Messages */}
                    {uploadStatus === 'success' && (
                        <div className="upload-success">
                            ✓ Uploaded to Intervals.icu
                        </div>
                    )}
                    {uploadStatus === 'error' && (
                        <div className="upload-error">
                            ✗ Upload failed: {uploadError}
                        </div>
                    )}
                </div>

                <div className="ride-summary-actions">
                    <button className="btn btn-primary btn-large" onClick={handleDownloadFit}>
                        💾 Download FIT File
                    </button>
                    {canUpload && uploadStatus !== 'success' && (
                        <button
                            className="btn btn-intervals btn-large"
                            onClick={handleUploadToIntervals}
                            disabled={uploadStatus === 'uploading'}
                        >
                            {uploadStatus === 'uploading' ? '⏳ Uploading...' : '☁️ Upload to Intervals.icu'}
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
});

export default RideSummary;

