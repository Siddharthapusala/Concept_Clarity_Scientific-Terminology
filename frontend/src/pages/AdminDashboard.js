import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Navbar from '../components/Navbar';
import CustomSelect from '../components/CustomSelect';
import './Admin.css';
import '../components/HistoryModal.css';

export default function AdminDashboard({ isDarkMode, toggleTheme }) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [showExportModal, setShowExportModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [viewMode, setViewMode] = useState('all');

    const [timeframe, setTimeframe] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [selectedLanguages, setSelectedLanguages] = useState([]);
    const [minQuizScore, setMinQuizScore] = useState('');
    const [maxQuizScore, setMaxQuizScore] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllQuizzers, setShowAllQuizzers] = useState(false);

    const [rolesDropdownOpen, setRolesDropdownOpen] = useState(false);
    const [langsDropdownOpen, setLangsDropdownOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const availableRoles = ['student', 'faculty', 'teacher', 'engineer', 'scientist', 'healthcare_professional', 'journalist', 'general_user'];
    const availableLangs = ['english', 'telugu', 'hindi'];

    const toggleArrayItem = (arr, setArr, item) => {
        setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
    };
    const navigate = useNavigate();

    const formatDuration = (seconds) => {
        if (!seconds && seconds !== 0) return '0s';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        let res = '';
        if (h > 0) res += `${h}h `;
        if (m > 0) res += `${m}m `;
        if (s > 0 || res === '') res += `${s}s`;
        return res.trim();
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                navigate('/admin-login');
                return;
            }
            setStats(null);

            const queryParams = new URLSearchParams();
            if (timeframe !== 'custom') queryParams.append('timeframe', timeframe);
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (selectedRoles.length > 0) queryParams.append('roles', selectedRoles.join(','));
            if (selectedLanguages.length > 0) queryParams.append('languages', selectedLanguages.join(','));
            if (minQuizScore) queryParams.append('min_quiz_score', minQuizScore);
            if (maxQuizScore) queryParams.append('max_quiz_score', maxQuizScore);

            const res = await api.get(`/admin/stats?${queryParams.toString()}`, {
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

    useEffect(() => {
        fetchStats();
        fetchUsers('all', false);
    }, [navigate, timeframe]);

    const applyFilters = () => {
        setRolesDropdownOpen(false);
        setLangsDropdownOpen(false);
        setStats(null);
        fetchStats();
    };

    const clearFilters = () => {
        setRolesDropdownOpen(false);
        setLangsDropdownOpen(false);
        setStartDate('');
        setEndDate('');
        setSelectedRoles([]);
        setSelectedLanguages([]);
        setMinQuizScore('');
        setMaxQuizScore('');
        setTimeframe('all');
    };

    const fetchExportData = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const queryParams = new URLSearchParams();
            if (timeframe !== 'custom') queryParams.append('timeframe', timeframe);
            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (selectedRoles.length > 0) queryParams.append('roles', selectedRoles.join(','));
            if (selectedLanguages.length > 0) queryParams.append('languages', selectedLanguages.join(','));
            if (minQuizScore) queryParams.append('min_quiz_score', minQuizScore);
            if (maxQuizScore) queryParams.append('max_quiz_score', maxQuizScore);

            const res = await api.get(`/admin/export_data?${queryParams.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return res.data;
        } catch (err) {
            console.error("Failed to fetch export data", err);
            return null;
        }
    };

    const handleExportExcel = async () => {
        if (!stats) return;
        const exportData = await fetchExportData();
        if (!exportData) return;

        const wb = XLSX.utils.book_new();

        const totalSearches = (stats.daily_searches || []).reduce((sum, item) => sum + (item.count || 0), 0);
        const topSearch = (stats.most_searched_words && stats.most_searched_words.length > 0) ? stats.most_searched_words[0].word || stats.most_searched_words[0].term || 'N/A' : 'N/A';

        const summaryArr = [
            ['Metric', 'Value'],
            ['Total Users', stats.total_members || 0],
            ['Total Quiz Players', stats.total_quiz_users || 0],
            ['Total Searches', totalSearches || 0],
            ['Total Video Views', stats.total_video_views || 0],
            ['Average Rating', stats.average_rating ? stats.average_rating.toFixed(1) : '0'],
            ['Top Search Term', topSearch],
            ['Top User', stats.top_quizzers?.[0]?.username || 'N/A'],
            ['Date Range Used', timeframe === 'custom' ? `${startDate} to ${endDate}` : timeframe]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryArr), "Summary");

        const usersMapped = exportData.users.map(u => ({
            "User ID": u.id,
            "Name": u.name,
            "Email": u.email,
            "Role": u.role,
            "Joined Date": u.joined_date,
            "Last Login": u.last_login,
            "Total Quizzes Attempted": u.total_quizzes_attempted,
            "Average Score": u.average_score,
            "Total Time Spent": u.time_spent
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usersMapped.length > 0 ? usersMapped : [{ "User ID": "No data found" }]), "Users");

        const quizMapped = exportData.quiz_results.map(q => ({
            "User Name": q.user_name,
            "Quiz Name": q.quiz_name,
            "Category": q.category,
            "Score": q.score,
            "Total Marks": q.total_marks,
            "Percentage": q.percentage,
            "Time Taken": q.time_taken,
            "Attempt Date": q.attempt_date,
            "Pass/Fail": q.status
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quizMapped.length > 0 ? quizMapped : [{ "User Name": "No data found" }]), "Quizzes");

        const searchMapped = exportData.search_analytics.map(s => ({
            "Search Query": s.search_query || 'N/A',
            "User": s.user || 'Unknown',
            "Language": s.language || 'en',
            "Date": s.date || 'N/A',
            "Result Count": s.result_count || 1,
            "Difficulty Level": s.difficulty_level || 'Beginner'
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchMapped.length > 0 ? searchMapped : [{ "Search Query": "No data found" }]), "Searches");

        const leaderMapped = exportData.leaderboard.map(l => ({
            "Rank": l.rank,
            "User": l.name,
            "Avg Score": l.average_score,
            "Total Attempts": l.total_quizzes_attempted,
            "Accuracy %": l.accuracy + "%",
            "Time Spent": l.time_spent
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaderMapped.length > 0 ? leaderMapped : [{ "Rank": "No data found" }]), "Leaderboard");

        XLSX.writeFile(wb, "Admin_Dashboard_Report.xlsx");
    };

    const handleExportCSV = async () => {
        if (!stats) return;
        const exportData = await fetchExportData();
        if (!exportData) return;

        let csvContent = "data:text/csv;charset=utf-8,";

        const totalSearches = (stats.daily_searches || []).reduce((sum, item) => sum + (item.count || 0), 0);
        const topSearch = (stats.most_searched_words && stats.most_searched_words.length > 0) ? stats.most_searched_words[0].word || stats.most_searched_words[0].term || 'N/A' : 'N/A';

        csvContent += "=== DASHBOARD SUMMARY ===\nMetric,Value\n";
        csvContent += `Total Users,${stats.total_members || 0}\n`;
        csvContent += `Total Quiz Players,${stats.total_quiz_users || 0}\n`;
        csvContent += `Total Searches,${totalSearches || 0}\n`;
        csvContent += `Total Video Views,${stats.total_video_views || 0}\n`;
        csvContent += `Average Rating,${stats.average_rating ? stats.average_rating.toFixed(1) : '0'}\n`;
        csvContent += `Top Search Term,${topSearch}\n`;
        csvContent += `Top User,${stats.top_quizzers?.[0]?.username || 'N/A'}\n`;
        csvContent += `Date Range Used,${timeframe === 'custom' ? startDate + " to " + endDate : timeframe}\n\n`;

        csvContent += "=== QUIZ RESULTS ===\nUser Name,Quiz Name,Category,Score,Total Marks,Percentage,Time Taken,Attempt Date,Pass/Fail\n";
        exportData.quiz_results.forEach(q => {
            csvContent += `"${q.user_name}","${q.quiz_name}","${q.category}",${q.score},${q.total_marks},"${q.percentage}","${q.time_taken}","${q.attempt_date}","${q.status}"\n`;
        });
        csvContent += "\n";

        csvContent += "=== SEARCH ANALYTICS ===\nSearch Query,User,Language,Date,Result Count,Difficulty Level\n";
        exportData.search_analytics.forEach(s => {
            csvContent += `"${s.search_query.replace(/"/g, '""')}","${s.user}","${s.language}","${s.date}",${s.result_count},"${s.difficulty_level}"\n`;
        });
        csvContent += "\n";

        csvContent += "=== LEADERBOARD ===\nRank,User,Avg Score,Total Attempts,Accuracy %,Time Spent\n";
        exportData.leaderboard.forEach(l => {
            csvContent += `${l.rank},"${l.name}","${l.average_score}",${l.total_quizzes_attempted},"${l.accuracy}%",${l.time_spent}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Admin_Dashboard_Report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportSpecificCSV = async (type) => {
        if (!stats) return;
        const exportData = await fetchExportData();
        if (!exportData) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        let filename = "";

        if (type === 'quiz') {
            filename = "Quiz_Results_Export.csv";
            csvContent += "User Name,Quiz Name,Category,Score,Total Marks,Percentage,Time Taken,Attempt Date,Pass/Fail\n";
            exportData.quiz_results.forEach(q => {
                csvContent += `"${q.user_name}","${q.quiz_name}","${q.category}",${q.score},${q.total_marks},"${q.percentage}","${q.time_taken}","${q.attempt_date}","${q.status}"\n`;
            });
        } else if (type === 'search') {
            filename = "Search_Analytics_Export.csv";
            csvContent += "Search Query,User,Language,Date,Result Count,Difficulty Level\n";
            exportData.search_analytics.forEach(s => {
                csvContent += `"${(s.search_query || "").replace(/"/g, '""')}","${s.user}","${s.language}","${s.date}",${s.result_count},"${s.difficulty_level}"\n`;
            });
        } else if (type === 'leaderboard') {
            filename = "Leaderboard_Export.csv";
            csvContent += "Rank,User,Avg Score,Total Attempts,Accuracy %,Time Spent\n";
            exportData.leaderboard.forEach(l => {
                csvContent += `${l.rank},"${l.name}","${l.average_score}",${l.total_quizzes_attempted},"${l.accuracy}%",${l.time_spent}\n`;
            });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportSpecificExcel = async (type) => {
        if (!stats) return;
        const exportData = await fetchExportData();
        if (!exportData) return;

        const wb = XLSX.utils.book_new();
        let filename = "";

        if (type === 'quiz') {
            filename = "Quiz_Results_Export.xlsx";
            const quizMapped = exportData.quiz_results.map(q => ({
                "User Name": q.user_name, "Quiz Name": q.quiz_name, "Category": q.category, "Score": q.score,
                "Total Marks": q.total_marks, "Percentage": q.percentage, "Time Taken": q.time_taken,
                "Attempt Date": q.attempt_date, "Pass/Fail": q.status
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(quizMapped.length > 0 ? quizMapped : [{ "User Name": "No data found" }]), "Quizzes");
        } else if (type === 'search') {
            filename = "Search_Analytics_Export.xlsx";
            const searchMapped = exportData.search_analytics.map(s => ({
                "Search Query": s.search_query || 'N/A', "User": s.user || 'Unknown', "Language": s.language || 'en',
                "Date": s.date || 'N/A', "Result Count": s.result_count || 1, "Difficulty Level": s.difficulty_level || 'Beginner'
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(searchMapped.length > 0 ? searchMapped : [{ "Search Query": "No data found" }]), "Searches");
        } else if (type === 'leaderboard') {
            filename = "Leaderboard_Export.xlsx";
            const leaderMapped = exportData.leaderboard.map(l => ({
                "Rank": l.rank, "User": l.name, "Avg Score": l.average_score, "Total Attempts": l.total_quizzes_attempted,
                "Accuracy %": l.accuracy + "%", "Time Spent": l.time_spent
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaderMapped.length > 0 ? leaderMapped : [{ "Rank": "No data found" }]), "Leaderboard");
        }

        XLSX.writeFile(wb, filename);
    };

    const fetchUsers = async (mode = 'all', showModal = true, forceRefresh = false) => {
        if (users.length > 0 && !forceRefresh) {
            setViewMode(mode);
            setSearchQuery('');
            if (showModal) setShowUsersModal(true);
            return;
        }
        setLoadingUsers(true);
        setViewMode(mode);
        setSearchQuery('');
        try {
            const token = localStorage.getItem('adminToken');
            const res = await api.get('/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
            if (showModal) setShowUsersModal(true);
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

    const filteredUserDetails = useMemo(() => {
        if (!users) return [];
        let list = [...users];

        if (viewMode === 'reviews') {
            list = list.filter(u => u.reviews && u.reviews.length > 0);
        } else if (viewMode === 'quiz') {
            list = list.filter(u => u.has_played_quiz || (u.avg_quiz_score !== null && u.avg_quiz_score !== undefined && u.avg_quiz_score !== 'N/A'));
        } else if (viewMode === 'top10') {
            list = list.filter(u => stats?.top_quizzers?.some(tq => tq.username === u.username)).sort((a, b) => {
                const indexA = stats.top_quizzers.findIndex(tq => tq.username === a.username);
                const indexB = stats.top_quizzers.findIndex(tq => tq.username === b.username);
                return indexA - indexB;
            });
        }

        if (!searchQuery) return list;

        const query = searchQuery.toLowerCase();
        return list.filter(u =>
            (u.username || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.role || '').toLowerCase().includes(query)
        );
    }, [users, viewMode, searchQuery, stats]);

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
            <div className="admin-page admin-loading-container">
                <div className="admin-spinner"></div>
                <p style={{ color: 'var(--admin-text-secondary)', fontWeight: '500' }}>Fetching Data...</p>
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
                        <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                            <button className="admin-btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                                📄 CSV
                            </button>
                            <button className="admin-btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}>
                                📑 Excel
                            </button>
                        </div>
                        <button
                            className="admin-btn-secondary"
                            onClick={() => setShowFilters(!showFilters)}
                            style={{ marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', color: 'var(--admin-text)' }}
                        >
                            📊 Filters
                        </button>
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

                {showFilters && (
                    <div className="admin-filters-panel animate-slide-up" style={{
                        backgroundColor: 'var(--admin-card)',
                        padding: '1.75rem',
                        borderRadius: '16px',
                        marginBottom: '2rem',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        position: 'relative',
                        zIndex: 10 // Ensure it stays above other content but allows children to float
                    }}>
                        <div style={{
                            position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
                            background: 'linear-gradient(to bottom, #60a5fa, #3b82f6)'
                        }}></div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                            {/* Quick Timeframe */}
                            <div className="filter-group">
                                <label className="filter-label">Quick Range</label>
                                <CustomSelect
                                    name="timeframe"
                                    className="filter-input-custom"
                                    value={timeframe}
                                    onChange={(e) => { setTimeframe(e.target.value); setStartDate(''); setEndDate(''); }}
                                    options={[
                                        { value: 'all', label: 'All Time' },
                                        { value: '30d', label: 'Last 30 Days' },
                                        { value: '7d', label: 'Last 7 Days' },
                                        { value: 'custom', label: 'Custom Dates' }
                                    ]}
                                />
                            </div>

                            {/* Date Range */}
                            {timeframe === 'custom' && (
                                <>
                                    <div className="filter-group">
                                        <label className="filter-label">Start Date</label>
                                        <input type="date" className="filter-input" value={startDate} onChange={e => { setStartDate(e.target.value); setTimeframe('custom'); }} />
                                    </div>
                                    <div className="filter-group">
                                        <label className="filter-label">End Date</label>
                                        <input type="date" className="filter-input" value={endDate} onChange={e => { setEndDate(e.target.value); setTimeframe('custom'); }} />
                                    </div>
                                </>
                            )}

                            {/* Quiz Score Range */}
                            <div className="filter-group">
                                <label className="filter-label">Quiz Score (%)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="number" placeholder="Min" min="0" max="100" className="filter-input" style={{ width: '50%' }} value={minQuizScore} onChange={e => setMinQuizScore(e.target.value)} />
                                    <input type="number" placeholder="Max" min="0" max="100" className="filter-input" style={{ width: '50%' }} value={maxQuizScore} onChange={e => setMaxQuizScore(e.target.value)} />
                                </div>
                            </div>

                            {/* Multi-Select Roles */}
                            <div className="filter-group">
                                <label className="filter-label">User Types</label>
                                <div className="multi-select-container">
                                    <div className="filter-input multi-select-btn" onClick={() => setRolesDropdownOpen(!rolesDropdownOpen)}>
                                        {selectedRoles.length === 0 ? "All Roles" : `${selectedRoles.length} Selected`}
                                    </div>
                                    {rolesDropdownOpen && (
                                        <div className="multi-select-dropdown">
                                            <label className="multi-select-option" style={{ fontWeight: 'bold' }}>
                                                <input type="checkbox" checked={selectedRoles.length === 0} onChange={() => setSelectedRoles([])} />
                                                All Roles
                                            </label>
                                            {availableRoles.map(role => (
                                                <label key={role} className="multi-select-option">
                                                    <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleArrayItem(selectedRoles, setSelectedRoles, role)} />
                                                    {role.replace('_', ' ')}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Multi-Select Languages */}
                            <div className="filter-group">
                                <label className="filter-label">Languages</label>
                                <div className="multi-select-container">
                                    <div className="filter-input multi-select-btn" onClick={() => setLangsDropdownOpen(!langsDropdownOpen)}>
                                        {selectedLanguages.length === 0 ? "Select Languages..." : `${selectedLanguages.length} Selected`}
                                    </div>
                                    {langsDropdownOpen && (
                                        <div className="multi-select-dropdown">
                                            {availableLangs.map(lang => (
                                                <label key={lang} className="multi-select-option">
                                                    <input type="checkbox" checked={selectedLanguages.includes(lang)} onChange={() => toggleArrayItem(selectedLanguages, setSelectedLanguages, lang)} />
                                                    <span style={{ textTransform: 'capitalize' }}>{lang}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        <div className="filter-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--admin-border)' }}>
                            <button className="admin-btn-secondary filter-btn-animated" onClick={clearFilters} style={{
                                background: 'transparent',
                                border: '1px solid var(--admin-border)',
                                color: 'var(--admin-text)',
                                padding: '0.6rem 1.5rem',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                fontWeight: 600
                            }}>Clear All</button>
                            <button className="admin-btn-primary filter-btn-animated" onClick={applyFilters} style={{
                                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '0.6rem 2rem',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                transition: 'all 0.2s',
                                fontWeight: 600
                            }}>Apply Filters ✨</button>
                        </div>
                    </div>
                )}

                <div className="stats-grid">
                    <div
                        className="stat-card blue animate-fade-in delay-100"
                        onClick={() => fetchUsers('all')}
                        style={{ cursor: 'pointer' }}
                        title="Click to view details"
                    >
                        <div className="stat-title">Total Members</div>
                        <div className="stat-value">{stats.total_members}</div>
                        <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '0.5rem' }}>View Details →</div>
                    </div>
                    <div
                        className="stat-card green animate-fade-in delay-200"
                        onClick={() => fetchUsers('reviews')}
                        style={{ cursor: 'pointer' }}
                        title="Click to view reviews"
                    >
                        <div className="stat-title">Total Reviews</div>
                        <div className="stat-value">
                            {stats.total_reviews !== undefined ? stats.total_reviews : '-'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.5rem' }}>View Details →</div>
                    </div>
                    <div className="stat-card amber animate-fade-in delay-300">
                        <div className="stat-title">Avg. Rating</div>
                        <div className="stat-value">
                            {stats.average_rating !== undefined ? stats.average_rating : '-'}
                            <span style={{ fontSize: '1.5rem', color: '#f59e0b', marginLeft: '0.5rem' }}>★</span>
                        </div>
                    </div>

                    <div className="stat-card animate-fade-in delay-400" style={{ borderLeftColor: '#ec4899', cursor: 'pointer' }} onClick={() => fetchUsers('quiz')} title="Click to view quiz players">
                        <div className="stat-title">Quiz Players</div>
                        <div className="stat-value">
                            {stats.total_quiz_users !== undefined ? stats.total_quiz_users : '-'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#ec4899', marginTop: '0.5rem' }}>View Details →</div>
                    </div>

                    <div className="stat-card animate-fade-in delay-100" style={{ borderLeftColor: '#8b5cf6' }}>
                        <div className="stat-title">Video Views</div>
                        <div className="stat-value">
                            {stats.total_video_views !== undefined ? stats.total_video_views : '-'}
                            <span style={{ fontSize: '1.5rem', marginLeft: '0.5rem' }}>🎬</span>
                        </div>
                    </div>

                    <div className="stat-card animate-fade-in delay-100" style={{ borderLeftColor: '#f43f5e', cursor: 'pointer', backgroundImage: 'linear-gradient(to right, rgba(244, 63, 94, 0.05), transparent)' }} onClick={() => setShowExportModal(true)}>
                        <div className="stat-title">Data Exports</div>
                        <div className="stat-value" style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem', marginLeft: '0.5rem' }}>⬇️</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#f43f5e', marginTop: '0.5rem' }}>View Formats →</div>
                    </div>
                </div>

                {stats.top_quizzers && stats.top_quizzers.length > 0 && (
                    <div className="chart-card leaderboard-section animate-slide-up" style={{ marginBottom: '2rem' }}>
                        <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Top Quizzers</h2>

                        <div className="podium-container">
                            {stats.top_quizzers.length > 1 && (
                                <div className="podium-step step-2">
                                    <div className="podium-avatar silver">
                                        {stats.top_quizzers[1].username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="podium-name">{stats.top_quizzers[1].username}</div>
                                    <div className="podium-score">{stats.top_quizzers[1].percentage}%</div>
                                    <div className="podium-bar silver-bar" style={{ height: '100px' }}>2</div>
                                </div>
                            )}

                            <div className="podium-step step-1">
                                <span className="crown-icon">👑</span>
                                <div className="podium-avatar gold">
                                    {stats.top_quizzers[0].username.charAt(0).toUpperCase()}
                                </div>
                                <div className="podium-name">{stats.top_quizzers[0].username}</div>
                                <div className="podium-score">{stats.top_quizzers[0].percentage}%</div>
                                <div className="podium-bar gold-bar" style={{ height: '140px' }}>1</div>
                            </div>

                            {stats.top_quizzers.length > 2 && (
                                <div className="podium-step step-3">
                                    <div className="podium-avatar bronze">
                                        {stats.top_quizzers[2].username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="podium-name">{stats.top_quizzers[2].username}</div>
                                    <div className="podium-score">{stats.top_quizzers[2].percentage}%</div>
                                    <div className="podium-bar bronze-bar" style={{ height: '80px' }}>3</div>
                                </div>
                            )}
                        </div>

                        {stats.top_quizzers.length > 3 && (
                            <div className="leaderboard-list-container" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                <button
                                    className="admin-btn-primary"
                                    onClick={() => fetchUsers('top10')}
                                    style={{ width: 'auto', padding: '0.75rem 2rem', borderRadius: '50px' }}
                                >
                                    View Top 10 Quiz Players
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {(() => {
                    const filteredLevels = (stats.level_stats || []).filter(item => item.name && item.name.toLowerCase() !== 'unknown');
                    const filteredLangs = (stats.language_stats || []).filter(item => item.name && item.name.toLowerCase() !== 'unknown');
                    const filteredSources = (stats.source_stats || []).filter(item => item.name && item.name.toLowerCase() !== 'unknown');

                    return (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="chart-card animate-slide-up">
                                    <h2 className="section-title">Search Complexity</h2>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        {filteredLevels.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={filteredLevels}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={60}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                                                            const RADIAN = Math.PI / 180;
                                                            const radius = outerRadius + 20;
                                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                            return (
                                                                <text
                                                                    x={x}
                                                                    y={y}
                                                                    fill={isDarkMode ? "#e2e8f0" : "#1f2937"}
                                                                    textAnchor={x > cx ? 'start' : 'end'}
                                                                    dominantBaseline="central"
                                                                    style={{ fontSize: '12px', fontWeight: 500 }}
                                                                >
                                                                    {`${name ? name.charAt(0).toUpperCase() + name.slice(1) : ''} ${(percent * 100).toFixed(0)}%`}
                                                                </text>
                                                            );
                                                        }}
                                                    >
                                                        {filteredLevels.map((entry, index) => {
                                                            const colorMap = { 'easy': '#34d399', 'medium': '#fbbf24', 'hard': '#f87171' };
                                                            return <Cell key={`cell-${index}`} fill={colorMap[entry.name.toLowerCase()] || '#8884d8'} />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        labelStyle={{ color: '#fff' }}
                                                        formatter={(value, name, props) => {
                                                            const total = filteredLevels.reduce((a, b) => a + b.value, 0);
                                                            const percent = ((value / total) * 100).toFixed(0);
                                                            const formattedName = name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
                                                            return [`${value} (${percent}%)`, formattedName];
                                                        }}
                                                    />
                                                    <Legend
                                                        verticalAlign="bottom"
                                                        height={36}
                                                        formatter={(value) => value ? value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ') : ''}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No level data</div>
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card">
                                    <h2 className="section-title">Search Methods</h2>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        {filteredSources.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={filteredSources}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={45}
                                                        outerRadius={65}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        paddingAngle={5}
                                                        cornerRadius={6}
                                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                                                            const RADIAN = Math.PI / 180;
                                                            const radius = outerRadius + 20;
                                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                            return (
                                                                <text
                                                                    x={x}
                                                                    y={y}
                                                                    fill={isDarkMode ? "#e2e8f0" : "#1f2937"}
                                                                    textAnchor={x > cx ? 'start' : 'end'}
                                                                    dominantBaseline="central"
                                                                    style={{ fontSize: '12px', fontWeight: 500 }}
                                                                >
                                                                    {`${name ? name.charAt(0).toUpperCase() + name.slice(1) : ''} ${(percent * 100).toFixed(0)}%`}
                                                                </text>
                                                            );
                                                        }}
                                                    >
                                                        {filteredSources.map((entry, index) => {
                                                            const colorMap = { 'text': '#60a5fa', 'image': '#a78bfa', 'voice': '#f472b6' };
                                                            return <Cell key={`cell-${index}`} fill={colorMap[entry.name.toLowerCase()] || '#8884d8'} />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        labelStyle={{ color: '#fff' }}
                                                        formatter={(value, name, props) => {
                                                            const total = filteredSources.reduce((a, b) => a + b.value, 0);
                                                            const percent = ((value / total) * 100).toFixed(0);
                                                            const formattedName = name ? name.charAt(0).toUpperCase() + name.slice(1) : name;
                                                            return [`${value} (${percent}%)`, formattedName];
                                                        }}
                                                    />
                                                    <Legend verticalAlign="bottom" height={36} formatter={(value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : ''} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No source data</div>
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card animate-slide-up delay-200">
                                    <h2 className="section-title">Language Distribution</h2>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        {filteredLangs.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={filteredLangs} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis dataKey="name" stroke="#9ca3af" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(val) => val ? val.charAt(0).toUpperCase() + val.slice(1) : ''} />
                                                    <YAxis allowDecimals={false} stroke="#9ca3af" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} labelFormatter={(label) => label ? label.charAt(0).toUpperCase() + label.slice(1) : ''} />
                                                    <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={isMobile ? 25 : 40}>
                                                        {filteredLangs.map((entry, index) => {
                                                            const colorMap = { 'english': '#38bdf8', 'telugu': '#a78bfa', 'hindi': '#fbbf24', 'spanish': '#f472b6' };
                                                            return <Cell key={`cell-${index}`} fill={colorMap[entry.name.toLowerCase()] || '#8884d8'} />;
                                                        })}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No language data</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="charts-grid">
                                <div className="chart-card animate-slide-up">
                                    <h2 className="section-title">User Roles Distribution</h2>
                                    <div style={{ height: '380px', width: '100%' }}>
                                        {stats.roles_stats && stats.roles_stats.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart margin={{ bottom: 20 }}>
                                                    <Pie
                                                        data={stats.roles_stats}
                                                        cx="50%" cy="40%" outerRadius={75} fill="#8884d8" dataKey="value"
                                                        paddingAngle={3}
                                                        cornerRadius={4}
                                                        labelLine={true}
                                                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                                                            const RADIAN = Math.PI / 180;
                                                            const radius = outerRadius + 20;
                                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                            if (percent < 0.05) return null;

                                                            return (
                                                                <text
                                                                    x={x}
                                                                    y={y}
                                                                    fill={isDarkMode ? "#d1d5db" : "#4b5563"}
                                                                    textAnchor={x > cx ? 'start' : 'end'}
                                                                    dominantBaseline="central"
                                                                    style={{ fontSize: '11px', fontWeight: 500 }}
                                                                >
                                                                    {`${name ? name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ') : ''} ${(percent * 100).toFixed(0)}%`}
                                                                </text>
                                                            );
                                                        }}
                                                    >
                                                        {stats.roles_stats.map((entry, index) => {
                                                            const colorMap = { 'student': '#60a5fa', 'faculty': '#34d399', 'admin': '#fb7185', 'general_user': '#fbbf24', 'engineer': '#a78bfa', 'healthcare_professional': '#38bdf8', 'journalist': '#f472b6', 'scientist': '#818cf8', 'teacher': '#c084fc' };
                                                            return <Cell key={`cell-${index}`} fill={colorMap[entry.name?.toLowerCase()] || '#8884d8'} />;
                                                        })}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value, name) => [value, name ? name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' ') : name]}
                                                    />
                                                    <Legend
                                                        verticalAlign="bottom"
                                                        align="center"
                                                        wrapperStyle={{ paddingTop: '10px', fontSize: '0.85rem', width: '100%', left: 0 }}
                                                        formatter={(value) => value ? value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ') : ''}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No role data</div>
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card animate-slide-up delay-100">
                                    <h2 className="section-title">Time Spent Per User (Top 5 Active)</h2>
                                    <div style={{ height: '380px', width: '100%' }}>
                                        {users && users.filter(u => u.time_spent > 0).length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={[...users].sort((a, b) => (b.time_spent || 0) - (a.time_spent || 0)).slice(0, 5).map(u => ({ ...u, time_spent_mins: Math.floor((u.time_spent || 0) / 60) }))}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: isMobile ? 10 : 25 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis
                                                        dataKey="username"
                                                        stroke={isDarkMode ? "#4b5563" : "#9ca3af"}
                                                        tick={!isMobile ? { fill: isDarkMode ? "#d1d5db" : "#4b5563", fontSize: 11, fontWeight: 500 } : false}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        interval={0}
                                                    />
                                                    <YAxis
                                                        allowDecimals={false}
                                                        stroke="#9ca3af"
                                                        tick={{ fill: '#6b7280' }}
                                                        label={{ value: 'Time', angle: -90, position: 'insideLeft', style: { fill: '#6b7280' } }}
                                                        tickFormatter={(value) => {
                                                            if (value < 60) return `${value}m`;
                                                            const h = Math.floor(value / 60);
                                                            return `${h}h`;
                                                        }}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                                        formatter={(value) => {
                                                            if (value < 60) return [`${value}m`, "Time Spent"];
                                                            const h = Math.floor(value / 60);
                                                            const m = value % 60;
                                                            return [(m > 0 ? `${h}h ${m}m` : `${h}h`), "Time Spent"];
                                                        }}
                                                    />
                                                    <Bar dataKey="time_spent_mins" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Time Spent" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No time data available yet. Users must interact with the app.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="chart-card animate-slide-up delay-200" style={{ gridColumn: '1 / -1' }}>
                                    <h2 className="section-title">Daily Searches (Last 30 Days)</h2>
                                    <div style={{ height: '300px', width: '100%' }}>
                                        {stats.daily_searches && stats.daily_searches.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.daily_searches} margin={{ top: 20, right: 30, left: 20, bottom: isMobile ? 10 : 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                                    <XAxis
                                                        dataKey="date"
                                                        stroke="#9ca3af"
                                                        tick={!isMobile ? { fill: '#6b7280', fontSize: 11, fontWeight: 500 } : false}
                                                        tickLine={false}
                                                        axisLine={false}
                                                        minTickGap={20}
                                                        tickFormatter={(dateStr) => {
                                                            const d = new Date(dateStr);
                                                            return isNaN(d) ? dateStr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                                        }}
                                                    />
                                                    <YAxis allowDecimals={false} stroke="#9ca3af" tick={{ fill: '#6b7280' }} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Searches" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No daily search data</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    );
                })()}

                <div className="admin-section-grid">
                    <div className="chart-card">
                        <h2 className="section-title">Search Trend Analysis</h2>
                        <div style={{ height: '350px', width: '100%' }}>
                            {stats.most_searched_words && stats.most_searched_words.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.most_searched_words} margin={{ top: 20, right: 30, left: 20, bottom: isMobile ? 10 : 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="word"
                                            stroke="#9ca3af"
                                            tick={!isMobile ? { fill: '#6b7280', fontSize: 12, fontWeight: 500 } : false}
                                            axisLine={false}
                                            tickLine={false}
                                            interval={0}
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
                                            barSize={isMobile ? 25 : 40}
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
                                <h2>{viewMode === 'reviews' ? 'User Reviews' : viewMode === 'quiz' ? 'Quiz Players' : viewMode === 'top10' ? 'Top 10 Quizzers' : 'Registered Users Details'}</h2>
                                <button className="admin-close-btn" onClick={() => setShowUsersModal(false)}>×</button>
                            </div>
                            <div className="admin-modal-body">
                                {loadingUsers ? (
                                    <div className="loading-text">Loading user data...</div>
                                ) : (
                                    <div className="table-container">
                                        <div style={{ marginBottom: '1rem' }}>
                                            <input
                                                type="text"
                                                placeholder="Search by username, email, or role..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'var(--admin-card)', color: 'var(--admin-text)' }}
                                            />
                                        </div>
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Username</th>
                                                    {(viewMode !== 'quiz' && viewMode !== 'top10') && <th>Email</th>}
                                                    {(viewMode !== 'quiz' && viewMode !== 'top10') && <th>Role</th>}
                                                    <th>Time Spent</th>
                                                    {viewMode === 'all' && <th>Videos Watched</th>}
                                                    {viewMode !== 'all' && (
                                                        <th>{(viewMode === 'quiz' || viewMode === 'top10') ? 'Average Score (Participation)' : 'Reviews'}</th>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUserDetails.map((user) => (
                                                    <tr key={user.id} className="admin-table-row">
                                                        <td className="font-medium">
                                                            {viewMode === 'top10' && stats?.top_quizzers ? (
                                                                <span style={{ marginRight: '8px', color: '#f59e0b', fontWeight: 'bold' }}>
                                                                    #{stats.top_quizzers.findIndex(tq => tq.username === user.username) + 1}
                                                                </span>
                                                            ) : null}
                                                            {user.username}
                                                        </td>
                                                        {(viewMode !== 'quiz' && viewMode !== 'top10') && <td className="text-secondary">{user.email || 'N/A'}</td>}
                                                        {(viewMode !== 'quiz' && viewMode !== 'top10') && (
                                                            <td>
                                                                <span className={`role-badge ${user.role}`}>
                                                                    {user.role}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td className="text-secondary">
                                                            {(viewMode === 'quiz' || viewMode === 'top10')
                                                                ? formatDuration(user.quiz_time_spent || 0)
                                                                : `${Math.floor((user.time_spent || 0) / 60)} mins`
                                                            }
                                                        </td>
                                                        {viewMode === 'all' && (
                                                            <td className="text-secondary font-medium" style={{ color: '#8b5cf6' }}>
                                                                {user.videos_watched || 0}
                                                            </td>
                                                        )}
                                                        {viewMode !== 'all' && (
                                                            <td>
                                                                {(viewMode === 'quiz' || viewMode === 'top10') ? (
                                                                    <span className="font-medium" style={{ color: 'var(--admin-primary)', background: 'var(--admin-bg)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                                        {user.avg_quiz_score !== undefined && user.avg_quiz_score !== null ? `${user.avg_quiz_score}` : 'Participated'}
                                                                    </span>
                                                                ) : viewMode === 'reviews' && user.reviews && user.reviews.length > 0 ? (
                                                                    user.reviews.map((rev, i) => (
                                                                        <div key={i} className="review-item" style={{ marginBottom: '8px' }}>
                                                                            <span className="star-rating" style={{ color: '#f59e0b' }}>{'★'.repeat(rev.rating)}</span>
                                                                            <span className="review-text" style={{ marginLeft: '8px', fontStyle: 'italic' }}>
                                                                                {rev.comment ? `"${rev.comment.substring(0, 30)}${rev.comment.length > 30 ? '...' : ''}"` : 'No comment'}
                                                                            </span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span style={{ color: '#9ca3af' }}>No recent data</span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div >
                )}

                {showExportModal && (
                    <div className="export-modal-overlay" onClick={() => setShowExportModal(false)}>
                        <div className="export-modal-content" onClick={e => e.stopPropagation()}>
                            <div className="export-modal-header">
                                <h2><span>⬇️</span> Data Exports</h2>
                                <button className="close-btn" onClick={() => setShowExportModal(false)}>&times;</button>
                            </div>
                            <div className="export-modal-body">
                                <div className="export-option-row">
                                    <div className="export-option-info">
                                        <h4>Quiz Results</h4>
                                        <p>Detailed user quiz scores.</p>
                                    </div>
                                    <div className="export-btn-group">
                                        <button className="export-btn-premium" onClick={() => handleExportSpecificCSV('quiz')}>📊 CSV</button>
                                        <button className="export-btn-premium excel" onClick={() => handleExportSpecificExcel('quiz')}>📗 Excel</button>
                                    </div>
                                </div>
                                <div className="export-option-row">
                                    <div className="export-option-info">
                                        <h4>Search Analytics</h4>
                                        <p>Individual search histories.</p>
                                    </div>
                                    <div className="export-btn-group">
                                        <button className="export-btn-premium" onClick={() => handleExportSpecificCSV('search')}>📊 CSV</button>
                                        <button className="export-btn-premium excel" onClick={() => handleExportSpecificExcel('search')}>📗 Excel</button>
                                    </div>
                                </div>
                                <div className="export-option-row">
                                    <div className="export-option-info">
                                        <h4>Leaderboard</h4>
                                        <p>Rankings and accuracy rankings.</p>
                                    </div>
                                    <div className="export-btn-group">
                                        <button className="export-btn-premium" onClick={() => handleExportSpecificCSV('leaderboard')}>📊 CSV</button>
                                        <button className="export-btn-premium excel" onClick={() => handleExportSpecificExcel('leaderboard')}>📗 Excel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div >
        </div >
    );
}
