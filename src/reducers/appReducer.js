export const initialState = {
    // Profile
    profile: null,

    // Connection
    trainerStatus: 'disconnected', // disconnected | connecting | connected
    hrmStatus: 'disconnected',
    trainerName: null,
    hrmName: null,

    // Live Data
    power: 0,
    cadence: 0,
    speed: 0,
    distance: 0,
    hr: 0,

    // ERG Control
    targetPower: 150,

    // Ride State
    isRiding: false,
    isPaused: false,
    elapsedSeconds: 0,

    // App State
    isOffline: !navigator.onLine,
};

export const ActionTypes = {
    SET_PROFILE: 'SET_PROFILE',
    UPDATE_TRAINER_STATUS: 'UPDATE_TRAINER_STATUS',
    UPDATE_HRM_STATUS: 'UPDATE_HRM_STATUS',
    UPDATE_TRAINER_DATA: 'UPDATE_TRAINER_DATA',
    UPDATE_HR_DATA: 'UPDATE_HR_DATA',
    SET_TARGET_POWER: 'SET_TARGET_POWER',
    START_RIDE: 'START_RIDE',
    PAUSE_RIDE: 'PAUSE_RIDE',
    RESUME_RIDE: 'RESUME_RIDE',
    STOP_RIDE: 'STOP_RIDE',
    UPDATE_ELAPSED: 'UPDATE_ELAPSED',
    SET_OFFLINE: 'SET_OFFLINE',
};

export function appReducer(state, action) {
    switch (action.type) {
        case ActionTypes.SET_PROFILE:
            return { 
                ...state, 
                profile: action.payload,
                targetPower: action.payload ? Math.round(action.payload.ftp * 0.5) : state.targetPower
            };

        case ActionTypes.UPDATE_TRAINER_STATUS:
            return {
                ...state,
                trainerStatus: action.payload.status,
                trainerName: action.payload.name || state.trainerName,
            };

        case ActionTypes.UPDATE_HRM_STATUS:
            return {
                ...state,
                hrmStatus: action.payload.status,
                hrmName: action.payload.name || state.hrmName,
            };

        case ActionTypes.UPDATE_TRAINER_DATA:
            return {
                ...state,
                power: action.payload.power ?? state.power,
                cadence: action.payload.cadence ?? state.cadence,
                speed: action.payload.speed ?? state.speed,
                distance: action.payload.distance ?? state.distance,
            };

        case ActionTypes.UPDATE_HR_DATA:
            return {
                ...state,
                hr: action.payload.hr ?? state.hr,
            };

        case ActionTypes.SET_TARGET_POWER:
            return { ...state, targetPower: action.payload };

        case ActionTypes.START_RIDE:
            return { ...state, isRiding: true, isPaused: false, elapsedSeconds: 0 };

        case ActionTypes.PAUSE_RIDE:
            return { ...state, isPaused: true };

        case ActionTypes.RESUME_RIDE:
            return { ...state, isPaused: false };

        case ActionTypes.STOP_RIDE:
            return { ...state, isRiding: false, isPaused: false };

        case ActionTypes.UPDATE_ELAPSED:
            return { ...state, elapsedSeconds: action.payload };

        case ActionTypes.SET_OFFLINE:
            return { ...state, isOffline: action.payload };

        default:
            return state;
    }
}
