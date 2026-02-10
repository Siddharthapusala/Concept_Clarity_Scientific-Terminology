import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Admin.css';


export default function AdminLogin() {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const payload = {
                username: formData.username,
                password: formData.password
            };

            const res = await api.post('/admin/login', payload);

            localStorage.setItem('adminToken', res.data.access_token);
            navigate('/admin-dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Admin login failed');
        }
    };

    return (
        <div className="admin-login-wrapper">
            <div className="admin-login-card">
                <div className="admin-login-header">
                    <div className="admin-login-icon">🛡️</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Portal</h2>
                    <p style={{ color: 'var(--admin-text-secondary)', marginTop: '0.5rem' }}>
                        Please sign in to continue
                    </p>
                </div>

                {error && (
                    <div className="admin-error-message">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="admin-input-group">
                        <label className="admin-label">Username</label>
                        <input
                            type="text"
                            name="username"
                            className="admin-input"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            placeholder="Enter username"
                        />
                    </div>
                    <div className="admin-input-group">
                        <label className="admin-label">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="admin-input"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            placeholder="••••••••"
                        />
                    </div>
                    <button type="submit" className="admin-btn-primary">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}
