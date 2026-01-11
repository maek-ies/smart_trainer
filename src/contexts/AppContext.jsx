/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
    getActiveProfile,
    setActiveProfile as setActiveProfileStorage,
    ensureDefaultProfile
} from '../services/profileService';
import { appReducer, initialState, ActionTypes } from '../reducers/appReducer';

// Context
const AppContext = createContext(null);

// Provider
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    // Load profile on mount
    useEffect(() => {
        ensureDefaultProfile();
        const profile = getActiveProfile();
        if (profile) {
            dispatch({ type: ActionTypes.SET_PROFILE, payload: profile });
        }
    }, []);

    // Online/offline listener
    useEffect(() => {
        const handleOnline = () => dispatch({ type: ActionTypes.SET_OFFLINE, payload: false });
        const handleOffline = () => dispatch({ type: ActionTypes.SET_OFFLINE, payload: true });

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Actions
    const actions = {
        setProfile: useCallback((profile) => {
            setActiveProfileStorage(profile.id);
            dispatch({ type: ActionTypes.SET_PROFILE, payload: profile });
        }, []),

        updateTrainerStatus: useCallback((status, name = null) => {
            dispatch({ type: ActionTypes.UPDATE_TRAINER_STATUS, payload: { status, name } });
        }, []),

        updateHRMStatus: useCallback((status, name = null) => {
            dispatch({ type: ActionTypes.UPDATE_HRM_STATUS, payload: { status, name } });
        }, []),

        updateTrainerData: useCallback((data) => {
            dispatch({ type: ActionTypes.UPDATE_TRAINER_DATA, payload: data });
        }, []),

        updateHRData: useCallback((data) => {
            dispatch({ type: ActionTypes.UPDATE_HR_DATA, payload: data });
        }, []),

        setTargetPower: useCallback((watts) => {
            dispatch({ type: ActionTypes.SET_TARGET_POWER, payload: watts });
        }, []),

        startRide: useCallback(() => {
            dispatch({ type: ActionTypes.START_RIDE });
        }, []),

        pauseRide: useCallback(() => {
            dispatch({ type: ActionTypes.PAUSE_RIDE });
        }, []),

        resumeRide: useCallback(() => {
            dispatch({ type: ActionTypes.RESUME_RIDE });
        }, []),

        stopRide: useCallback(() => {
            dispatch({ type: ActionTypes.STOP_RIDE });
        }, []),

        updateElapsed: useCallback((seconds) => {
            dispatch({ type: ActionTypes.UPDATE_ELAPSED, payload: seconds });
        }, []),
    };

    return (
        <AppContext.Provider value={{ state, ...actions }}>
            {children}
        </AppContext.Provider>
    );
}

// Hook
export function useApp() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
}
