import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './services/api';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import './App.css';
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token with backend
          await api.get('/me');
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Session expired or invalid", error);
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
    };
    checkAuth();
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };
  return (
    <Router>
      <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
        <Navbar
          isAuthenticated={isAuthenticated}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
        />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <Home isAuthenticated={isAuthenticated} isDarkMode={isDarkMode} />
              }
            />
            <Route
              path="/profile"
              element={
                isAuthenticated ? <Profile onLogout={handleLogout} /> : <Navigate to="/login" replace />
              }
            />
            <Route
              path="/login"
              element={
                !isAuthenticated ?
                  <Login onLogin={handleLogin} /> :
                  <Navigate to="/" replace />
              }
            />
            <Route
              path="/signup"
              element={
                !isAuthenticated ?
                  <Signup /> :
                  <Navigate to="/" replace />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;
