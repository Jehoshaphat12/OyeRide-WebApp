import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import HelpCenterPage from './pages/HelpCenterPage';
import ContactUsPage from './pages/ContactUsPage';
import SafetyPage from './pages/SafetyPage';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import AndroidInstallBanner from './components/AndroidInstallBanner';
import './styles/globals.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={splashStyles.screen}>
        <div style={splashStyles.logoBox}>
          <div style={splashStyles.logoCircle}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path d="M12 27c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <circle cx="22" cy="16" r="4" fill="white" />
              <path d="M17 32l5-5 5 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={splashStyles.logoText}>OyeRide</span>
        </div>
        <div style={splashStyles.spinnerWrap}>
          <div style={splashStyles.spinner} />
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? <>{children}</> : <Navigate to="/" replace />;
}

function AppRoutes() {
  return (
    <div className="app-shell">
      <AndroidInstallBanner />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><HelpCenterPage /></ProtectedRoute>} />
        <Route path="/contact" element={<ProtectedRoute><ContactUsPage /></ProtectedRoute>} />
        <Route path="/safety" element={<ProtectedRoute><SafetyPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

const splashStyles: Record<string, React.CSSProperties> = {
  screen: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(160deg, #061ffa 0%, #0215be 60%, #030e8c 100%)',
    gap: 32,
  },
  logoBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1.5px solid rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 800,
    color: 'white',
    letterSpacing: -0.5,
    fontFamily: "'Poppins', sans-serif",
  },
  spinnerWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
