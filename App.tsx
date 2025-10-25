import React, { useState } from 'react';
import { LoggedInUser, UserRole } from './types';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

const App: React.FC = () => {
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [isAdminViewingAsUser, setIsAdminViewingAsUser] = useState(false);

  // For demo purposes, we'll use a fixed user ID when admin views as user.
  // In a real app, this would be selected from a list of students.
  const userToViewAs = 'student@example.com';

  const handleLogin = (id: string, role: UserRole) => {
    setLoggedInUser({ id, role });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setIsAdminViewingAsUser(false);
  };

  const handleSwitchView = (role: UserRole) => {
    if (loggedInUser?.role === UserRole.ADMIN) {
      setIsAdminViewingAsUser(role === UserRole.USER);
    }
  };

  const renderContent = () => {
    if (!loggedInUser) {
      return <LoginPage onLogin={handleLogin} />;
    }
  
    if (loggedInUser.role === UserRole.ADMIN && !isAdminViewingAsUser) {
      return <AdminDashboard onLogout={handleLogout} onSwitchView={handleSwitchView} />;
    }
    
    // This covers both a logged-in user and an admin viewing as a user.
    const userId = (loggedInUser.role === UserRole.ADMIN && isAdminViewingAsUser) ? userToViewAs : loggedInUser.id;
    const isAdminViewing = loggedInUser.role === UserRole.ADMIN && isAdminViewingAsUser;
  
    return (
      <UserDashboard 
        onLogout={handleLogout} 
        userId={userId} 
        isAdminViewing={isAdminViewing}
        onSwitchView={isAdminViewing ? handleSwitchView : undefined}
      />
    );
  }

  return (
    <div className="bg-indigo-950 text-white min-h-screen">
      {renderContent()}
    </div>
  );
};

export default App;