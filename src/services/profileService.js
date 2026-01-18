// Profile Service - Manages user profiles in localStorage

const PROFILES_KEY = 'smart_trainer_profiles';
const ACTIVE_PROFILE_KEY = 'smart_trainer_active_profile_id';

/**
 * Default profile template
 */
const createDefaultProfile = (name = 'Default') => ({
    id: crypto.randomUUID(),
    name,
    ftp: 200,
    maxHr: 180,
    intervalsApiKey: '',
    intervalsAthleteId: '',
    autoStartRide: false, // Auto-start ride when cycling detected for 5 seconds
    createdAt: new Date().toISOString(),
});

/**
 * Get all profiles
 */
export function getProfiles() {
    try {
        const profiles = localStorage.getItem(PROFILES_KEY);
        return profiles ? JSON.parse(profiles) : [];
    } catch (e) {
        console.error('Error reading profiles:', e);
        return [];
    }
}

/**
 * Save profiles array to storage
 */
function saveProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

/**
 * Get the active profile, or null if none
 */
export function getActiveProfile() {
    const profiles = getProfiles();
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);

    if (!activeId) return null;

    const profile = profiles.find(p => p.id === activeId);
    return profile || null;
}

/**
 * Set the active profile by ID
 */
export function setActiveProfile(profileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId);
}

/**
 * Create or update a profile
 */
export function saveProfile(profile) {
    const profiles = getProfiles();
    const existingIndex = profiles.findIndex(p => p.id === profile.id);

    if (existingIndex >= 0) {
        profiles[existingIndex] = { ...profiles[existingIndex], ...profile };
    } else {
        profiles.push(profile);
    }

    saveProfiles(profiles);
    return profile;
}

/**
 * Delete a profile by ID
 */
export function deleteProfile(profileId) {
    const profiles = getProfiles().filter(p => p.id !== profileId);
    saveProfiles(profiles);

    // Clear active if deleted
    const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (activeId === profileId) {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
}

/**
 * Create a quick-start profile if none exist
 */
export function ensureDefaultProfile() {
    const profiles = getProfiles();
    if (profiles.length === 0) {
        const defaultProfile = createDefaultProfile('Rider');
        saveProfile(defaultProfile);
        setActiveProfile(defaultProfile.id);
        return defaultProfile;
    }
    return null;
}

export { createDefaultProfile };
