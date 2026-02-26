import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './services/api';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import QuizPage from './pages/QuizPage';
import Navbar from './components/Navbar';
import './App.css';
import { translations } from './utils/translations';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });
  const [isQuizActive, setIsQuizActive] = useState(false);

  const t = translations[language] || translations['en'];

  const fetchUserProfile = async () => {
    try {
      const res = await api.get('/me');
      setIsAuthenticated(true);
      if (res.data.language) {
        setLanguage(res.data.language);
        localStorage.setItem('language', res.data.language);
      }
    } catch (error) {
      console.error("Session expired or invalid", error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await fetchUserProfile();
      }
    };
    checkAuth();
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const recordAppTime = async (seconds) => {
    if (!isAuthenticated) return;
    try {
      const token = localStorage.getItem('token');
      await api.post('/record-time', { time_spent: seconds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Error recording time:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('token');
    const interval = setInterval(() => {
      api.post('/record-time', { time_spent: 60 }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.error(err));
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogin = async () => {
    return await fetchUserProfile();
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };
  return (
    <Router>
      <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
        {!isQuizActive && (
          <Navbar
            isAuthenticated={isAuthenticated}
            onLogout={handleLogout}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
            t={t}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        )}
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  isAuthenticated={isAuthenticated}
                  isDarkMode={isDarkMode}
                  language={language}
                  setLanguage={handleLanguageChange}
                  t={t}
                  recordAppTime={recordAppTime}
                />
              }
            />
            <Route
              path="/quiz"
              element={
                isAuthenticated ?
                  <QuizPage
                    isDarkMode={isDarkMode}
                    language={language}
                    t={t}
                    isQuizActive={isQuizActive}
                    setIsQuizActive={setIsQuizActive}
                  /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/profile"
              element={
                isAuthenticated ?
                  <Profile
                    onLogout={handleLogout}
                    language={language}
                    setLanguage={handleLanguageChange}
                    t={t}
                  /> :
                  <Navigate to="/login" replace />
              }
            />
            <Route
              path="/login"
              element={
                !isAuthenticated ?
                  <Login onLogin={handleLogin} t={t} /> :
                  <Navigate to="/" replace />
              }
            />
            <Route
              path="/signup"
              element={
                !isAuthenticated ?
                  <Signup t={t} onLanguageChange={handleLanguageChange} /> :
                  <Navigate to="/" replace />
              }
            />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin-dashboard"
              element={
                <AdminDashboard
                  isDarkMode={isDarkMode}
                  toggleTheme={toggleTheme}
                  t={t}
                  language={language}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
export default App;
