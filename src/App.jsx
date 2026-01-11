import { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
import { getActiveProfile } from './services/profileService';
import ProfileSelection from './components/ProfileSelection';
import Dashboard from './components/Dashboard';
import History from './components/History';
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

  const handleShowHistory = () => {
    setCurrentView('history');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
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
        <Dashboard 
          onSwitchProfile={handleSwitchProfile} 
          onShowHistory={handleShowHistory}
        />
      )}
      {currentView === 'history' && (
        <History onBack={handleBackToDashboard} />
      )}
    </AppProvider>
  );
}

export default App;
