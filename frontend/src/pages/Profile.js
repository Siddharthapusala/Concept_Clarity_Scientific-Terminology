import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Auth.css';
export default function Profile({ onLogout }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', username: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const fetchMe = async () => {
    try {
      const res = await api.get('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      setForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        username: res.data.username || ''
      });
      try {
        sessionStorage.setItem('profileCache', JSON.stringify(res.data));
      } catch { }
    } catch (e) {
      setError('Failed to load profile');
    }
  };
  const fetchHistory = async () => {
    try {
      const res = await api.get('/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };
  useEffect(() => {
    const cached = sessionStorage.getItem('profileCache');
    if (cached) {
      try {
        const v = JSON.parse(cached);
        setData(v);
        setForm({
          first_name: v.first_name || '',
          last_name: v.last_name || '',
          username: v.username || ''
        });
      } catch { }
    }
    fetchMe();
    fetchHistory();
  }, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.put('/profile', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchMe();
      setEdit(false);
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.message || 'Update failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  if (!data) {
    return (
      <div className="auth-card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-icon">🧠</div>
            <div className="logo-text">ConceptClarity</div>
          </div>
          <h2 className="auth-title">Profile</h2>
        </div>
        <p>Loading...</p>
      </div>
    );
  }
  return (
    <div className="auth-card" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <div className="auth-header profile-header">
        <div className="auth-logo profile-logo">
          <div className="logo-icon">🧠</div>
          <div className="logo-text">ConceptClarity</div>
        </div>
        <h2 className="auth-title">Profile</h2>
      </div>

      {!edit ? (
        <div className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="form-input">{data.username || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="form-input">{data.email || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <div className="form-input">{data.role}</div>
          </div>
          <div className="form-group">
            <label className="form-label">First Name</label>
            <div className="form-input">{data.first_name || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <div className="form-input">{data.last_name || '—'}</div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="first_name" className="form-label">First Name</label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="form-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="last_name" className="form-label">Last Name</label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="form-input"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="form-input"
              disabled={loading}
              autoComplete="username"
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading} className="auth-button save-btn">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="nav-button logout-btn" onClick={() => setEdit(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="panel-actions" style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
        <button
          className="auth-button"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          Back
        </button>
        <button
          className="auth-button"
          onClick={() => setEdit(!edit)}
          disabled={loading}
        >
          {edit ? 'Close Edit' : 'Edit Profile'}
        </button>
        <button
          className="nav-button logout-btn"
          onClick={() => { onLogout(); navigate('/'); }}
          disabled={loading}
          style={{ background: '#ef4444', color: 'white', border: 'none' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
