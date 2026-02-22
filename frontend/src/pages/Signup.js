import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import './Auth.css';


export default function Signup() {
  const [formData, setFormData] = useState({ email: '', username: '', role: 'general_user', language: 'en', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', requirements: [] });
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

  const checkPasswordStrength = (password) => {
    const requirements = [
      { test: password.length >= 8, message: 'At least 8 characters' },
      { test: password.length <= 128, message: 'Not more than 128 characters' },
      { test: /[A-Z]/.test(password), message: 'One uppercase letter' },
      { test: /[a-z]/.test(password), message: 'One lowercase letter' },
      { test: /\d/.test(password), message: 'One number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'One special character' }
    ];
    const passedRequirements = requirements.filter(req => req.test);
    const score = (passedRequirements.length / requirements.length) * 100;

    let message = '';
    if (score === 100) message = 'Strong password';
    else if (score >= 66) message = 'Medium strength';
    else if (score >= 33) message = 'Weak password';
    else message = 'Very weak password';

    return { score, message, requirements };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    if (name === 'password') {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email && !formData.username) {
      setError('Enter either email or username');
      return;
    }
    if (formData.email && !validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (formData.username && !validateUsername(formData.username)) {
      setError('Username must be 3-20 chars, letters/numbers/_');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (passwordStrength.score < 100) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/signup', {
        email: formData.email || null,
        username: formData.username || null,
        role: formData.role,
        language: formData.language,
        password: formData.password,
      });

      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.innerHTML = `
        <div class="success-content">
          <div class="success-icon">✅</div>
          <div class="success-text">
            <h3>Account Created Successfully!</h3>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);

      setTimeout(() => {
        successMessage.remove();
        navigate('/login');
      }, 3000);
    } catch (err) {
      let errorMessage = 'Signup failed. Please try again.';
      if (err.response?.data?.detail) {
        if (err.response.data.detail === 'Email already exists') {
          errorMessage = 'This email is already registered. Please login instead.';
        } else {
          errorMessage = err.response.data.detail;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
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
          <h2 className="auth-title">Create Your Account</h2>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Choose a unique username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              disabled={loading}
              autoComplete="username"
            />
            <small className="helper-text">You can sign in using email or username</small>
          </div>
          <div className="form-group">
            <label htmlFor="role" className="form-label">Role</label>
            <CustomSelect
              name="role"
              className="role-select"
              value={formData.role}
              onChange={handleChange}
              options={[
                { value: 'student', label: 'Student' },
                { value: 'teacher', label: 'Teacher' },
                { value: 'scientist', label: 'Scientist' },
                { value: 'journalist', label: 'Journalist' },
                { value: 'engineer', label: 'Engineer' },
                { value: 'healthcare_professional', label: 'Healthcare Professional' },
                { value: 'general_user', label: 'General User' }
              ]}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="language" className="form-label">Preferred Language</label>
            <CustomSelect
              name="language"
              className="language-select"
              value={formData.language}
              onChange={handleChange}
              options={[
                { value: 'en', label: 'English' },
                { value: 'te', label: 'Telugu' },
                { value: 'hi', label: 'Hindi' }
              ]}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <div className="input-container">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
                className="form-input"
                disabled={loading}
                autoComplete="new-password"
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
            <div className="password-strength">
              <div className={`strength-bar ${passwordStrength.score === 100 ? 'strong' : passwordStrength.score >= 66 ? 'medium' : 'weak'}`}></div>
              <span className={`strength-text ${passwordStrength.score === 100 ? 'strong' : passwordStrength.score >= 66 ? 'medium' : 'weak'}`}>
                {passwordStrength.message}
              </span>
            </div>
            {formData.password && (
              <div className="password-requirements">
                {passwordStrength.requirements.map((req, index) => (
                  <div key={index} className={`requirement ${req.test ? 'met' : 'unmet'}`}>
                    {req.test ? '✅' : '❌'} {req.message}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <div className="input-container">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="form-input"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {formData.confirmPassword && (
              <div className="password-match">
                {formData.password === formData.confirmPassword ? (
                  <span className="match-text match">✅ Passwords match</span>
                ) : (
                  <span className="match-text mismatch">❌ Passwords don't match</span>
                )}
              </div>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading} className="auth-button">
              {loading ? (
                <span className="button-content">
                  <span className="loading-spinner"></span>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
        <div className="auth-footer">
          <p className="footer-text">Already have an account? <Link to="/login" className="auth-link">Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
