import { useState } from 'react';
import { getProfiles, saveProfile, setActiveProfile, createDefaultProfile, deleteProfile } from '../services/profileService';
import { useApp } from '../contexts/AppContext';
import './ProfileSelection.css';

function ProfileSelection({ onProfileSelected }) {
    const { setProfile } = useApp();
    const [profiles, setProfiles] = useState(getProfiles());
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingProfile, setEditingProfile] = useState(null);

    const handleSelectProfile = (profile) => {
        setActiveProfile(profile.id);
        setProfile(profile);
        onProfileSelected(profile);
    };

    const handleCreateProfile = () => {
        if (!newName.trim()) return;

        const newProfile = createDefaultProfile(newName.trim());
        saveProfile(newProfile);
        setProfiles(getProfiles());
        setNewName('');
        setIsCreating(false);
        handleSelectProfile(newProfile);
    };

    const handleQuickStart = () => {
        const quickProfile = createDefaultProfile('Quick Ride');
        saveProfile(quickProfile);
        handleSelectProfile(quickProfile);
    };

    const handleEditProfile = (profile, e) => {
        e.stopPropagation();
        setEditingProfile({ ...profile });
    };

    const handleSaveEdit = () => {
        if (!editingProfile) return;

        saveProfile(editingProfile);
        setProfiles(getProfiles());
        setEditingProfile(null);
    };

    const handleCancelEdit = () => {
        setEditingProfile(null);
    };

    const handleDeleteProfile = () => {
        if (!editingProfile) return;

        // Prevent deletion of last profile
        if (profiles.length <= 1) {
            alert('Cannot delete the last profile. Create another profile first.');
            return;
        }

        const confirmMsg = `Are you sure you want to delete the profile "${editingProfile.name}"? This action cannot be undone.`;
        if (!window.confirm(confirmMsg)) return;

        deleteProfile(editingProfile.id);
        setProfiles(getProfiles());
        setEditingProfile(null);

        // If we deleted the active profile, the user will need to select another
        // (profileService already handles clearing active profile)
    };

    const updateEditingField = (field, value) => {
        setEditingProfile(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="profile-selection-page">
            <div className="profile-selection-header">
                <h1>🚴 Smart Trainer</h1>
                <p className="text-muted">Select your profile to start</p>
            </div>

            <div className="profile-list">
                {profiles.map((profile) => (
                    <div key={profile.id} className="profile-card-wrapper">
                        <button
                            className="profile-card"
                            onClick={() => handleSelectProfile(profile)}
                        >
                            <div className="profile-avatar">
                                {profile.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="profile-info">
                                <div className="profile-name">{profile.name}</div>
                                <div className="profile-stats">
                                    FTP: {profile.ftp}W • Max HR: {profile.maxHr} bpm
                                    {profile.intervalsAthleteId && ' • 📊'}
                                </div>
                            </div>
                            <span className="profile-arrow">→</span>
                        </button>
                        <button
                            className="profile-edit-btn"
                            onClick={(e) => handleEditProfile(profile, e)}
                            title="Edit profile"
                        >
                            ⚙️
                        </button>
                    </div>
                ))}
            </div>

            {isCreating ? (
                <div className="create-profile-form card">
                    <div className="form-group">
                        <label className="form-label">Profile Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="create-profile-actions">
                        <button
                            className="btn btn-icon"
                            onClick={() => setIsCreating(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreateProfile}
                            disabled={!newName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </div>
            ) : (
                <div className="profile-actions">
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleQuickStart}
                    >
                        ⚡ Quick Start
                    </button>
                    <button
                        className="btn btn-icon"
                        onClick={() => setIsCreating(true)}
                    >
                        + New Profile
                    </button>
                </div>
            )}

            {/* Edit Profile Modal */}
            {editingProfile && (
                <div className="edit-profile-overlay" onClick={handleCancelEdit}>
                    <div className="edit-profile-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="edit-profile-header">
                            <h2>Edit Profile</h2>
                            <button className="close-btn" onClick={handleCancelEdit}>×</button>
                        </div>

                        <div className="edit-profile-content">
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={editingProfile.name}
                                    onChange={(e) => updateEditingField('name', e.target.value)}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">FTP (Watts)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={editingProfile.ftp}
                                        onChange={(e) => updateEditingField('ftp', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Max HR (bpm)</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={editingProfile.maxHr}
                                        onChange={(e) => updateEditingField('maxHr', parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={editingProfile.autoStartRide || false}
                                        onChange={(e) => updateEditingField('autoStartRide', e.target.checked)}
                                        style={{ width: 'auto', margin: 0 }}
                                    />
                                    Auto-start ride when cycling detected
                                </label>
                                <p className="text-muted form-hint" style={{ marginTop: '4px', fontSize: '12px' }}>
                                    Automatically starts recording after 5 seconds of pedaling
                                </p>
                            </div>

                            <div className="form-section">
                                <h3>📊 Intervals.icu Integration</h3>
                                <p className="text-muted form-hint">
                                    Get your API Key from Settings → Developer Settings
                                </p>

                                <div className="form-group">
                                    <label className="form-label">Athlete ID</label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g., i12345"
                                        value={editingProfile.intervalsAthleteId || ''}
                                        onChange={(e) => updateEditingField('intervalsAthleteId', e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">API Key</label>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="Your API key..."
                                        value={editingProfile.intervalsApiKey || ''}
                                        onChange={(e) => updateEditingField('intervalsApiKey', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="edit-profile-actions">
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteProfile}
                                disabled={profiles.length <= 1}
                                title={profiles.length <= 1 ? "Cannot delete last profile" : "Delete profile"}
                            >
                                🗑️ Delete
                            </button>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-secondary" onClick={handleCancelEdit}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveEdit}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProfileSelection;

