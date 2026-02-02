import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import HistoryModal from './HistoryModal';
import './Navbar.css';
export default function Navbar({ isAuthenticated, onLogout, isDarkMode, toggleTheme }) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const goProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await api.get('/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        sessionStorage.setItem('profileCache', JSON.stringify(res.data));
      }
    } catch { }
    navigate('/profile');
  };

  const toggleHistory = async () => {
    if (!showHistory) {
      try {
        const res = await api.get('/history');
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch history", err);
      }
    }
    setShowHistory(!showHistory);
  };
  return (
    <nav className={`navbar ${isDarkMode ? 'dark' : ''}`}>
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🧠</span>
          ConceptClarity
        </Link>
        <div className="nav-menu">
          {!currentPath.includes('admin') && (
            <>
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              {isAuthenticated ? (
                <>
                  <div className="profile-widget">
                    <button
                      className="history-icon-btn"
                      onClick={toggleHistory}
                      title="Search History"
                    >
                      <svg className="history-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                    </button>
                    <button className="profile-icon-btn" onClick={goProfile}>
                      <svg className="user-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="4"></circle>
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`nav-link ${currentPath === '/login' || currentPath === '/' ? 'active' : ''}`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className={`nav-button signup-btn ${currentPath === '/signup' || currentPath === '/' ? 'active' : ''}`}
                  >
                    Sign Up
                  </Link>
                  <Link
                    to="/admin-login"
                    className={`nav-link ${currentPath === '/admin-login' ? 'active' : ''}`}
                    style={{ marginLeft: '1rem' }}
                  >
                    Admin
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {showHistory && (
        <HistoryModal
          history={history}
          onClose={() => setShowHistory(false)}
          onDeleteItem={async (id) => {
            try {
              await api.delete(`/history/${id}`);
              setHistory((prev) => prev.filter((h) => h.id !== id));
            } catch (err) {
              console.error("Failed to delete history item", err);
            }
          }}
          onClearAll={async () => {
            try {
              await api.delete(`/history`);
              setHistory([]);
            } catch (err) {
              console.error("Failed to clear history", err);
            }
          }}
        />
      )}
    </nav>
  );
}
