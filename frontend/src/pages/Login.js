import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import './Auth.css';
export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (location.state?.message) {
      setError(location.state.message);
    }
  }, [location.state]);
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isUsername = (v) => /^[a-zA-Z0-9_]{3,20}$/.test(v);
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEmail(formData.identifier) && !isUsername(formData.identifier)) {
      setError('Enter a valid email or username');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = isEmail(formData.identifier) ? { email: formData.identifier } : { username: formData.identifier };
      const res = await api.post('/login', { ...payload, password: formData.password });
      localStorage.setItem('token', res.data.access_token);
      onLogin();
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🧠</div>
            <div className="logo-text">ConceptClarity</div>
          </div>
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">Sign in to access your personalized learning experience</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="identifier" className="form-label">Email or Username</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="Enter email or username"
              value={formData.identifier}
              onChange={handleChange}
              required
              className="form-input"
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? (
                <span className="button-content">
                  <span className="loading-spinner"></span>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="footer-text">Don't have an account? <Link to="/signup" className="auth-link">Create Account</Link></p>
        </div>
      </div>
    </div>
  );
}
