// Bluetooth Service - Web Bluetooth API for smart trainers

// FTMS Service and Characteristics UUIDs
const FTMS_SERVICE_UUID = 0x1826;
const INDOOR_BIKE_DATA_UUID = 0x2AD2;
const FITNESS_MACHINE_CONTROL_POINT_UUID = 0x2AD9;
const FITNESS_MACHINE_STATUS_UUID = 0x2ADA;
const FITNESS_MACHINE_FEATURE_UUID = 0x2ACC;

// Heart Rate Service
const HEART_RATE_SERVICE_UUID = 0x180D;
const HEART_RATE_MEASUREMENT_UUID = 0x2A37;

// Wahoo Proprietary Service
const WAHOO_SERVICE_UUID = 'a026ee07-0a7d-4ab3-97fa-f1500f9feb8b';
const WAHOO_CONTROL_UUID = 'a026e005-0a7d-4ab3-97fa-f1500f9feb8b';

// Control Point Op Codes
const OP_CODE_REQUEST_CONTROL = 0x00;
const OP_CODE_RESET = 0x01;
const OP_CODE_SET_TARGET_POWER = 0x05;

// Connection state
let trainerDevice = null;
let trainerServer = null;
let ftmsService = null;
let indoorBikeDataChar = null;
let controlPointChar = null;

let hrmDevice = null;
let hrmServer = null;
let hrmService = null;
let hrmMeasurementChar = null;

// Callbacks
let onTrainerData = null;
let onHRMData = null;
let onConnectionChange = null;

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported() {
    return 'bluetooth' in navigator;
}

/**
 * Attempt to auto-connect to previously paired devices
 */
export async function tryAutoConnect(callbacks = {}) {
    if (!isBluetoothSupported() || !navigator.bluetooth.getDevices) {
        return null;
    }

    onTrainerData = callbacks.onTrainerData || (() => { });
    onHRMData = callbacks.onHRMData || (() => { });
    onConnectionChange = callbacks.onConnectionChange || (() => { });
    
    const results = { trainer: null, hrm: null };

    try {
        const devices = await navigator.bluetooth.getDevices();
        if (devices.length === 0) return results;

        console.log('Found paired devices:', devices.length);

        for (const device of devices) {
            // Skip if already connected
            if (device.gatt.connected) continue;

            try {
                // Connect
                const server = await device.gatt.connect();

                // Check for FTMS service (Trainer)
                try {
                    const service = await server.getPrimaryService(FTMS_SERVICE_UUID);
                    
                    // It is a trainer! Setup characteristics
                    trainerDevice = device;
                    trainerServer = server;
                    ftmsService = service;
                    
                    indoorBikeDataChar = await ftmsService.getCharacteristic(INDOOR_BIKE_DATA_UUID);
                    await indoorBikeDataChar.startNotifications();
                    indoorBikeDataChar.addEventListener('characteristicvaluechanged', handleIndoorBikeData);

                    controlPointChar = await ftmsService.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT_UUID);
                    await requestControl();

                    device.addEventListener('gattserverdisconnected', handleTrainerDisconnect);
                    results.trainer = { name: trainerDevice.name, id: trainerDevice.id };
                    console.log('Auto-connected Trainer:', device.name);
                    continue; // Move to next device
                } catch {
                    // Not a trainer, maybe HRM?
                }

                // Check for Heart Rate service (HRM)
                try {
                    const service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
                    
                    // It is an HRM!
                    hrmDevice = device;
                    hrmServer = server;
                    hrmService = service;
                    
                    hrmMeasurementChar = await hrmService.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);
                    await hrmMeasurementChar.startNotifications();
                    hrmMeasurementChar.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
                    
                    device.addEventListener('gattserverdisconnected', handleHRMDisconnect);
                    results.hrm = { name: hrmDevice.name, id: hrmDevice.id };
                    console.log('Auto-connected HRM:', device.name);
                    continue; 
                } catch {
                    // Not an HRM either
                    console.log('Device not recognized as Trainer or HRM:', device.name);
                    device.gatt.disconnect();
                }

            } catch (err) {
                console.warn('Auto-connect failed for device:', device.name, err);
            }
        }
    } catch (err) {
        console.error('Error during auto-connect:', err);
    }
    
    return results;
}

/**
 * Scan and connect to a smart trainer
 */
export async function connectTrainer(callbacks = {}) {
    if (!isBluetoothSupported()) {
        throw new Error('Web Bluetooth is not supported in this browser');
    }

    onTrainerData = callbacks.onData || (() => { });
    onConnectionChange = callbacks.onConnectionChange || (() => { });

    try {
        onConnectionChange('connecting');

        // Request device with FTMS service
        trainerDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { services: [FTMS_SERVICE_UUID] },
                { services: [WAHOO_SERVICE_UUID] },
            ],
            optionalServices: [FTMS_SERVICE_UUID, WAHOO_SERVICE_UUID]
        });

        // Set up disconnect listener
        trainerDevice.addEventListener('gattserverdisconnected', handleTrainerDisconnect);

        // Connect to GATT server
        trainerServer = await trainerDevice.gatt.connect();

        // Get FTMS service
        try {
            ftmsService = await trainerServer.getPrimaryService(FTMS_SERVICE_UUID);

            // Get Indoor Bike Data characteristic
            indoorBikeDataChar = await ftmsService.getCharacteristic(INDOOR_BIKE_DATA_UUID);

            // Subscribe to notifications
            await indoorBikeDataChar.startNotifications();
            indoorBikeDataChar.addEventListener('characteristicvaluechanged', handleIndoorBikeData);

            // Get Control Point characteristic
            controlPointChar = await ftmsService.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT_UUID);

            // Request control
            await requestControl();

        } catch (err) {
            console.warn('FTMS not available, trying Wahoo protocol:', err.message);
            // Could implement Wahoo fallback here
        }

        onConnectionChange('connected');
        return { name: trainerDevice.name, id: trainerDevice.id };

    } catch (error) {
        onConnectionChange('disconnected');
        throw error;
    }
}

/**
 * Connect to a Heart Rate Monitor
 */
export async function connectHRM(callbacks = {}) {
    if (!isBluetoothSupported()) {
        throw new Error('Web Bluetooth is not supported in this browser');
    }

    onHRMData = callbacks.onData || (() => { });

    hrmDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE_UUID] }],
    });

    hrmDevice.addEventListener('gattserverdisconnected', handleHRMDisconnect);

    hrmServer = await hrmDevice.gatt.connect();
    hrmService = await hrmServer.getPrimaryService(HEART_RATE_SERVICE_UUID);
    hrmMeasurementChar = await hrmService.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);

    await hrmMeasurementChar.startNotifications();
    hrmMeasurementChar.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);

    return { name: hrmDevice.name, id: hrmDevice.id };
}

/**
 * Request control of the trainer
 */
async function requestControl() {
    if (!controlPointChar) return;

    const data = new Uint8Array([OP_CODE_REQUEST_CONTROL]);
    await controlPointChar.writeValue(data);
}

/**
 * Set target power (ERG mode)
 * @param {number} watts - Target power in watts
 */
export async function setTargetPower(watts) {
    if (!controlPointChar) {
        console.warn('Control point not available');
        return false;
    }

    const power = Math.max(0, Math.min(2000, Math.round(watts))); // Clamp 0-2000W
    const data = new Uint8Array([
        OP_CODE_SET_TARGET_POWER,
        power & 0xFF,        // Low byte
        (power >> 8) & 0xFF  // High byte
    ]);

    return controlPointChar.writeValue(data)
        .then(() => true)
        .catch(err => {
            console.error('Failed to set target power:', err);
            return false;
        });
}

/**
 * Parse Indoor Bike Data characteristic
 */
function handleIndoorBikeData(event) {
    const value = event.target.value;
    const flags = value.getUint16(0, true);

    let offset = 2;
    const data = {
        timestamp: Date.now(),
    };

    // Parse based on flags
    // Bit 0: More Data (not relevant for parsing)
    // Bit 1: Average Speed present
    // Bit 2: Instantaneous Cadence present
    // Bit 3: Average Cadence present
    // Bit 4: Total Distance present
    // Bit 5: Resistance Level present
    // Bit 6: Instantaneous Power present
    // Bit 7: Average Power present
    // ... more flags

    // Instantaneous Speed (always present if bit 0 is 0)
    if (!(flags & 0x01)) {
        data.speed = value.getUint16(offset, true) / 100; // km/h with 0.01 resolution
        offset += 2;
    }

    // Average Speed
    if (flags & 0x02) {
        data.avgSpeed = value.getUint16(offset, true) / 100;
        offset += 2;
    }

    // Instantaneous Cadence
    if (flags & 0x04) {
        data.cadence = value.getUint16(offset, true) / 2; // 0.5 resolution
        offset += 2;
    }

    // Average Cadence
    if (flags & 0x08) {
        offset += 2; // Skip
    }

    // Total Distance
    if (flags & 0x10) {
        data.distance = value.getUint16(offset, true) + (value.getUint8(offset + 2) << 16); // 3 bytes
        offset += 3;
    }

    // Resistance Level
    if (flags & 0x20) {
        data.resistance = value.getInt16(offset, true);
        offset += 2;
    }

    // Instantaneous Power
    if (flags & 0x40) {
        data.power = value.getInt16(offset, true);
        offset += 2;
    }

    // Average Power
    if (flags & 0x80) {
        data.avgPower = value.getInt16(offset, true);
        offset += 2;
    }

    onTrainerData(data);
}

/**
 * Parse Heart Rate Measurement characteristic
 */
function handleHeartRateMeasurement(event) {
    const value = event.target.value;
    const flags = value.getUint8(0);

    const data = {
        timestamp: Date.now(),
        rrIntervals: [],
    };

    let offset = 1;

    // HR Value format
    if (flags & 0x01) {
        // 16-bit HR value
        data.hr = value.getUint16(offset, true);
        offset += 2;
    } else {
        // 8-bit HR value
        data.hr = value.getUint8(offset);
        offset += 1;
    }

    // Sensor Contact Status (bits 1-2)
    // Energy Expended (bit 3)
    if (flags & 0x08) {
        offset += 2; // Skip energy expended
    }

    // RR-Intervals (bit 4)
    if (flags & 0x10) {
        while (offset + 1 < value.byteLength) {
            // RR interval in 1/1024 seconds, convert to ms
            const rrRaw = value.getUint16(offset, true);
            const rrMs = Math.round((rrRaw / 1024) * 1000);
            data.rrIntervals.push(rrMs);
            offset += 2;
        }
    }

    onHRMData(data);
}

/**
 * Handle trainer disconnect
 */
function handleTrainerDisconnect() {
    console.log('Trainer disconnected');
    onConnectionChange('disconnected');

    // Attempt reconnection
    attemptReconnect();
}

/**
 * Handle HRM disconnect
 */
function handleHRMDisconnect() {
    console.log('HRM disconnected');
}

/**
 * Attempt to reconnect to trainer
 */
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

async function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('Max reconnect attempts reached');
        reconnectAttempts = 0;
        return;
    }

    if (!trainerDevice) return;

    reconnectAttempts++;
    onConnectionChange('connecting');

    try {
        trainerServer = await trainerDevice.gatt.connect();
        ftmsService = await trainerServer.getPrimaryService(FTMS_SERVICE_UUID);
        indoorBikeDataChar = await ftmsService.getCharacteristic(INDOOR_BIKE_DATA_UUID);

        await indoorBikeDataChar.startNotifications();
        indoorBikeDataChar.addEventListener('characteristicvaluechanged', handleIndoorBikeData);

        controlPointChar = await ftmsService.getCharacteristic(FITNESS_MACHINE_CONTROL_POINT_UUID);
        await requestControl();

        onConnectionChange('connected');
        reconnectAttempts = 0;

    } catch (err) {
        console.error('Reconnect attempt failed:', err);
        setTimeout(attemptReconnect, 2000);
    }
}

/**
 * Disconnect all devices
 */
export function disconnectAll() {
    if (trainerDevice && trainerDevice.gatt.connected) {
        trainerDevice.gatt.disconnect();
    }
    if (hrmDevice && hrmDevice.gatt.connected) {
        hrmDevice.gatt.disconnect();
    }

    trainerDevice = null;
    hrmDevice = null;
}

/**
 * Get connection status
 */
export function getConnectionStatus() {
    return {
        trainer: trainerDevice?.gatt?.connected ? 'connected' : 'disconnected',
        trainerName: trainerDevice?.name || null,
        hrm: hrmDevice?.gatt?.connected ? 'connected' : 'disconnected',
        hrmName: hrmDevice?.name || null,
    };
}
