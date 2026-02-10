import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Admin.css';
import '../components/HistoryModal.css';

export default function AdminDashboard({ isDarkMode, toggleTheme }) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                if (!token) {
                    navigate('/admin-login');
                    return;
                }
                const res = await api.get('/admin/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch stats", err);
                setError('Failed to load dashboard data. Access denied.');
                if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                    navigate('/admin-login');
                }
            }
        };
        fetchStats();
    }, [navigate]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await api.get('/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
            setShowUsersModal(true);
        } catch (err) {
            console.error("Failed to fetch users", err);
            alert("Failed to load user details.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/');
    };

    if (error) {
        return (
            <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 className="admin-title">Access Error</h2>
                    <p style={{ color: 'var(--admin-text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
                    <button onClick={handleLogout} className="admin-logout-btn">Back to Home</button>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="admin-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--admin-text-secondary)' }}>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-container">
                <header className="admin-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.75rem' }}>🛡️</span>
                        <h1 className="admin-title">Admin Dashboard</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button
                            className="admin-theme-btn"
                            onClick={toggleTheme}
                            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                        <button onClick={handleLogout} className="admin-logout-btn">
                            Sign Out
                        </button>
                    </div>
                </header>

                <div className="stats-grid">
                    <div
                        className="stat-card blue"
                        onClick={fetchUsers}
                        style={{ cursor: 'pointer' }}
                        title="Click to view details"
                    >
                        <div className="stat-title">Total Members</div>
                        <div className="stat-value">{stats.total_members}</div>
                        <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.5rem' }}>View Details →</div>
                    </div>
                    <div className="stat-card green">
                        <div className="stat-title">Total Reviews</div>
                        <div className="stat-value">
                            {stats.total_reviews !== undefined ? stats.total_reviews : '-'}
                        </div>
                    </div>
                    <div className="stat-card amber">
                        <div className="stat-title">Avg. Rating</div>
                        <div className="stat-value">
                            {stats.average_rating !== undefined ? stats.average_rating : '-'}
                            <span style={{ fontSize: '1.5rem', color: '#f59e0b', marginLeft: '0.5rem' }}>★</span>
                        </div>
                    </div>
                </div>

                <div className="admin-section-grid">
                    <div className="chart-card">
                        <h2 className="section-title">Search Trend Analysis</h2>
                        <div style={{ height: '350px', width: '100%' }}>
                            {stats.most_searched_words && stats.most_searched_words.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.most_searched_words} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="word"
                                            stroke="#9ca3af"
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={0}
                                            angle={-30}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            stroke="#9ca3af"
                                            tick={{ fill: '#6b7280', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                                color: '#f1f5f9'
                                            }}
                                            itemStyle={{ color: '#f1f5f9' }}
                                            labelStyle={{ color: '#94a3b8' }}
                                        />
                                        <Bar
                                            dataKey="count"
                                            fill="var(--admin-primary)"
                                            radius={[4, 4, 0, 0]}
                                            barSize={40}
                                            name="Searches"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                    No data available
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="chart-card">
                        <h2 className="section-title">Top Searches</h2>
                        <div className="admin-list">
                            {stats.most_searched_words && stats.most_searched_words.length > 0 ? (
                                stats.most_searched_words.map((item, index) => (
                                    <div key={index} className="admin-list-item">
                                        <span className="item-label">
                                            {index + 1}. {item.word}
                                        </span>
                                        <span className="item-value">
                                            {item.count}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#6b7280', textAlign: 'center', padding: '1rem' }}>
                                    No records found
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {showUsersModal && (
                    <div className="admin-modal-overlay" onClick={() => setShowUsersModal(false)}>
                        <div className="admin-modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-modal-header">
                                <h2>Registered Users Details</h2>
                                <button className="admin-close-btn" onClick={() => setShowUsersModal(false)}>×</button>
                            </div>
                            <div className="admin-modal-body">
                                {loadingUsers ? (
                                    <div className="loading-text">Loading user data...</div>
                                ) : (
                                    <div className="table-container">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Username</th>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                    <th>Reviews</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((user) => (
                                                    <tr key={user.id} className="admin-table-row">
                                                        <td className="font-medium">{user.username}</td>
                                                        <td className="text-secondary">{user.email || 'N/A'}</td>
                                                        <td>
                                                            <span className={`role-badge ${user.role}`}>
                                                                {user.role}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {user.reviews && user.reviews.length > 0 ? (
                                                                user.reviews.map((rev, i) => (
                                                                    <div key={i} className="review-item">
                                                                        <span className="star-rating">{'★'.repeat(rev.rating)}</span>
                                                                        <span className="review-text">
                                                                            {rev.comment ? `"${rev.comment.substring(0, 30)}${rev.comment.length > 30 ? '...' : ''}"` : ''}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="no-reviews">No reviews</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
