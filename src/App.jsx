import { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
import { getActiveProfile } from './services/profileService';
import ProfileSelection from './components/ProfileSelection';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  const [currentView, setCurrentView] = useState(() => {
    return getActiveProfile() ? 'dashboard' : 'profile-selection';
  });

  const handleProfileSelected = () => {
    setCurrentView('dashboard');
  };

  const handleSwitchProfile = () => {
    setCurrentView('profile-selection');
  };

  if (currentView === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">🚴</div>
      </div>
    );
  }

  return (
    <AppProvider>
      {currentView === 'profile-selection' && (
        <ProfileSelection onProfileSelected={handleProfileSelected} />
      )}
      {currentView === 'dashboard' && (
        <Dashboard onSwitchProfile={handleSwitchProfile} />
      )}
    </AppProvider>
  );
}

export default App;
