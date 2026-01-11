# Smart Trainer Controller

## Project Overview
This project is a **React + Vite** web application designed to control smart bike trainers via the **Web Bluetooth API**. It acts as a head unit for indoor cycling, allowing users to execute structured workouts, record ride data, and sync with third-party platforms like Intervals.icu.

### Key Features
*   **Device Connectivity:** Connects to Smart Trainers (FTMS & Wahoo protocols) and Heart Rate Monitors via Web Bluetooth.
*   **Workout Execution:** Plays structured workouts with ERG mode control (automatically setting target power on the trainer).
*   **Integration:** Fetches planned workouts from and uploads completed activities (FIT files) to **Intervals.icu**.
*   **Data Recording:** Captures high-frequency ride data (Power, Cadence, Speed, HR) and handles local persistence for crash recovery.
*   **PWA Support:** Configured as a Progressive Web App for offline usage (where hardware allows).

## Architecture

### Tech Stack
*   **Build Tool:** Vite
*   **Framework:** React 19
*   **State Management:** React Context + useReducer (`AppContext`)
*   **Charting:** Recharts
*   **Bluetooth:** Native Web Bluetooth API (no external library wrapper)

### Core Services (`src/services/`)
*   **`bluetoothService.js`:** Handles low-level GATT server connections, service/characteristic discovery, and data parsing (FTMS & HR services).
*   **`rideRecorder.js`:** Singleton class responsible for buffering ride data, calculating averages, and persisting temporary state to `localStorage`.
*   **`intervalsService.js`:** API client for Intervals.icu to fetch daily workouts and upload activity files.
*   **`fitService.js`:** (Inferred) Handles the generation of binary FIT files for activity exports.

### State Management
Global state is managed in `src/contexts/AppContext.jsx`. It handles:
*   **Connection Status:** Trainer/HRM connection states.
*   **Live Data:** Instantaneous power, cadence, HR, etc.
*   **Session State:** Ride timer, active workout, user profile.

## Development

### Prerequisites
*   Node.js (LTS recommended)
*   A browser supporting Web Bluetooth (Chrome, Edge, Bluefy on iOS)

### Scripts
*   `npm run dev`: Start the development server.
*   `npm run build`: Build for production.
*   `npm run lint`: Run ESLint.
*   `npm run preview`: Preview the production build locally.

### Key Conventions
*   **Bluetooth:** All Bluetooth logic is encapsulated in `bluetoothService.js`. Components should consume data via `AppContext` rather than direct service calls where possible.
*   **Styling:** CSS modules or plain CSS files imported alongside components (e.g., `WorkoutPlayer.css`).
*   **Project Structure:** Feature-based organization within `components/` and logic separation in `services/`.

## Critical Considerations
*   **Web Bluetooth Security:** The API requires a secure context (HTTPS) or `localhost`.
*   **Hardware Compatibility:** Testing requires actual Bluetooth hardware (Smart Trainer/HRM) or a simulator.
*   **LocalStorage:** The app relies on `localStorage` to recover rides in case of accidental refresh/crash.
