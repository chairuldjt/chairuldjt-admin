import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Shell from './components/layout/Shell';
import Overview from './pages/Overview';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Storage from './pages/Storage';
import Security from './pages/Security';
import TerminalPage from './pages/Terminal';
import UsersPage from './pages/UsersPage';
import Cloudflared from './pages/Cloudflared';

function Dashboard({ onLogout }) {
  const location = useLocation();

  // Derive active tab from URL path
  const pathMap = {
    '/': 'Overview',
    '/services': 'Services',
    '/users': 'Users',
    '/storage': 'Storage',
    '/security': 'Security',
    '/cloudflared': 'Cloudflared',
    '/terminal': 'Terminal',
    '/settings': 'Settings',
  };
  const activeTab = pathMap[location.pathname] || 'Overview';

  return (
    <Shell onLogout={onLogout} activeTab={activeTab}>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/services" element={<Services />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/storage" element={<Storage />} />
        <Route path="/security" element={<Security />} />
        <Route path="/cloudflared" element={<Cloudflared />} />
        <Route path="/terminal" element={<TerminalPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    const savedUser = localStorage.getItem('nexus_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user');
    setUser(null);
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      {user ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Routes>
          <Route path="*" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export default App;
