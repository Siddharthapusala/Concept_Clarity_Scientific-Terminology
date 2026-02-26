import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './QuizPage.css';

export default function QuizPage({ isDarkMode, language, t, isQuizActive, setIsQuizActive }) {
    const text = t || {};
    const [difficulty, setDifficulty] = useState('');
    const [loading, setLoading] = useState(false);
    const [quizData, setQuizData] = useState(null);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
    const [allTopics, setAllTopics] = useState([]);
    const [activeTopic, setActiveTopic] = useState('All');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isTopicLoading, setIsTopicLoading] = useState(false);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [showExtendedLeaderboard, setShowExtendedLeaderboard] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [showFsPrompt, setShowFsPrompt] = useState(false);
    const [pendingStart, setPendingStart] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchLeaderboard('');
    }, []);

    useEffect(() => {
        const handleFsChange = () => {
            const fs = !!document.fullscreenElement;
            setIsFullScreen(fs);
            if (fs && pendingStart) {
                const { level, specificTopic } = pendingStart;
                setPendingStart(null);
                setShowFsPrompt(false);
                startQuiz(level, specificTopic);
            }
        };

        const handleContextMenu = (e) => {
            if (quizData && !quizSubmitted) {
                e.preventDefault();
            }
        };

        const handleBlur = () => {
            if (quizData && !quizSubmitted && isFullScreen) {
                // Potential cheating attempt (tab switch or minimize)
                // We'll let the Full Screen listener handle the FS exit, 
                // but we can also log this or show a specific warning.
            }
        };

        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('blur', handleBlur);
        };
    }, [pendingStart, quizData, quizSubmitted, isFullScreen]);

    useEffect(() => {
        if (quizData && !quizSubmitted && timeLeft > 0 && isFullScreen) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && quizData && !quizSubmitted) {
            handleQuizSubmit();
        }
    }, [timeLeft, quizData, quizSubmitted, isFullScreen]);

    const startQuiz = async (level, specificTopic = null) => {
        if (!document.fullscreenElement) {
            setPendingStart({ level, specificTopic });
            setShowFsPrompt(true);
            return;
        }

        if (isQuizActive) {
            setIsTopicLoading(true);
        } else {
            setLoading(true);
            setIsTransitioning(true);
        }
        setDifficulty(level);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            let qs = `/quiz?level=${level}&language=${language}`;
            if (specificTopic && specificTopic !== 'All') {
                qs += `&topic=${encodeURIComponent(specificTopic)}`;
            }

            const res = await api.get(qs, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Minimum loading time for professional feel
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (res.data.status === 'success' && res.data.quiz.length > 0) {
                const processedQuiz = res.data.quiz.map(q => ({
                    ...q,
                    parentTopic: specificTopic && specificTopic !== 'All' ? specificTopic : (q.topic || 'General')
                }));

                setQuizData({ ...res.data, quiz: processedQuiz });

                if (!specificTopic || specificTopic === 'All') setAllTopics(res.data.terms_used);
                setActiveTopic(specificTopic || 'All');
                setSelectedAnswers({});
                setScore(0);
                setQuizSubmitted(false);

                if (level === 'easy') setTimeLeft(5 * 60);
                else if (level === 'medium') setTimeLeft(15 * 60);
                else setTimeLeft(30 * 60);

                setIsQuizActive(true);
            } else {
                setError(text.quizGenerationFailed || 'Quiz generation failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError(text.quizError || 'Error generating quiz. Server might be busy.');
        } finally {
            setLoading(false);
            setIsTransitioning(false);
            setIsTopicLoading(false);
        }
    };

    const handleOptionSelect = (qIndex, option) => {
        if (quizSubmitted) return;
        setSelectedAnswers(prev => {
            if (prev[qIndex] === option) {
                const updated = { ...prev };
                delete updated[qIndex];
                return updated;
            }
            return { ...prev, [qIndex]: option };
        });
    };

    const fetchLeaderboard = async (level) => {
        setLoadingLeaderboard(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/quiz/leaderboard?difficulty=${level}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeaderboard(res.data);
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
        } finally {
            setLoadingLeaderboard(false);
        }
    };

    const enterFsAndStart = async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch (err) {
            console.error("Error entering full screen:", err);
            if (pendingStart) {
                const { level, specificTopic } = pendingStart;
                setPendingStart(null);
                setShowFsPrompt(false);
                startQuiz(level, specificTopic);
            }
        }
    };

    const handleQuizSubmit = async () => {
        if (quizSubmitted) return;
        setShowReviewModal(false);

        let newScore = 0;
        quizData.quiz.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.answer) newScore += 1;
        });

        setScore(newScore);
        setQuizSubmitted(true);

        try {
            const token = localStorage.getItem('token');
            let initialTime = difficulty === 'easy' ? 5 * 60 : difficulty === 'medium' ? 15 * 60 : 30 * 60;
            const timeTaken = initialTime - timeLeft;

            await api.post('/quiz/results', {
                score: newScore,
                total_questions: quizData.quiz.length,
                difficulty: difficulty,
                topic: activeTopic === 'All' ? null : activeTopic,
                time_taken: timeTaken
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchLeaderboard(difficulty);
            setIsQuizActive(false);
        } catch (err) {
            console.error("Failed to save quiz score", err);
        }
    };

    const resetQuiz = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        setIsQuizActive(false);
        setQuizData(null);
        setDifficulty('');
        setQuizSubmitted(false);
        setShowReviewModal(false);
        setError('');
        setTimeLeft(0);
        setAllTopics([]);
        setActiveTopic('All');
        setShowExtendedLeaderboard(false);
        fetchLeaderboard('');
    };

    const trySubmitQuiz = () => {
        if (Object.keys(selectedAnswers).length < quizData.quiz.length) {
            setShowReviewModal(true);
        } else {
            handleQuizSubmit();
        }
    };

    const jumpToQuestion = (qIndex) => {
        setShowReviewModal(false);
        const element = document.getElementById(`question-${qIndex}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const renderLeaderboard = (titlePrefix) => {
        const top3 = leaderboard.slice(0, 3);
        const rest = leaderboard.slice(3);
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push({ ...top3[1], podiumRank: 2 });
        if (top3[0]) podiumOrder.push({ ...top3[0], podiumRank: 1 });
        if (top3[2]) podiumOrder.push({ ...top3[2], podiumRank: 3 });

        return (
            <div className="quiz-leaderboard-section">
                <h3 className="leaderboard-title">🏆 {text.leaderboard || 'Leaderboard'}</h3>
                {loadingLeaderboard ? (
                    <p style={{ color: '#64748b' }}>{text.pullingRanks || 'Pulling ranks...'}</p>
                ) : leaderboard.length > 0 ? (
                    <div className="quiz-leaderboard-list-wrapper">
                        {podiumOrder.length > 0 && (
                            <div className="quiz-podium-container">
                                {podiumOrder.map((lb) => {
                                    const lbScorePercent = Math.round((lb.score / lb.total_questions) * 100);
                                    return (
                                        <div key={`podium-${lb.id}`} className={`quiz-podium-item podium-rank-${lb.podiumRank}`}>
                                            <div className="podium-avatar">{lb.podiumRank === 1 ? '👑' : lb.podiumRank === 2 ? '🥈' : '🥉'}</div>
                                            <div className="podium-name-wrapper" title={lb.username}>{lb.username}</div>
                                            <div className="podium-bar">
                                                <span className="podium-score">{lb.score}/{lb.total_questions}</span>
                                                <span className="podium-score-percent">({lbScorePercent}%)</span>
                                                <div className="podium-rank-number">{lb.podiumRank}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {rest.length > 0 && (
                            <div className="quiz-leaderboard-actions" style={{ textAlign: 'center', marginTop: '1rem' }}>
                                {!showExtendedLeaderboard ? (
                                    <button className="quiz-view-all-btn" onClick={() => setShowExtendedLeaderboard(true)}>{text.viewAllRankings || 'View All Rankings'}</button>
                                ) : (
                                    <div className="quiz-leaderboard-scrollable">
                                        {rest.map((lb, idx) => (
                                            <div key={lb.id} className="quiz-leaderboard-item rest">
                                                <span className="lb-rank">#{idx + 4}</span>
                                                <span className="lb-name">{lb.username}</span>
                                                <div className="lb-stats">
                                                    <span className="lb-score">{lb.score}/{lb.total_questions} ({Math.round((lb.score / lb.total_questions) * 100)}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                        <button className="quiz-view-all-btn" style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: '#64748b' }} onClick={() => setShowExtendedLeaderboard(false)}>{text.showLess || 'Show Less'}</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <p style={{ color: '#64748b', textAlign: 'center' }}>{text.noScoresYet || 'No scores recorded yet. Be the first to conquer!'}</p>
                )}
            </div>
        );
    };

    return (
        <div className={`quiz-page-container ${isDarkMode ? 'dark-mode' : ''}`}>
            {!quizData && !loading && (
                <div className="quiz-setup-card">
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem', width: '100%' }}>
                        <button className="quiz-start-btn" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem', width: 'auto', background: 'linear-gradient(to right, #3b82f6, #2563eb)', color: 'white' }} onClick={() => navigate('/')}>
                            ← {text.backToSearch || 'Back to Search'}
                        </button>
                    </div>
                    <h1 className="quiz-page-title">{text.quizTitle || 'Concept Quiz Challenge'}</h1>
                    <p className="quiz-page-subtitle">{text.quizSubtitle || 'Test your knowledge with a custom quiz built from your recent searches!'}</p>
                    {error && <div className="quiz-page-error">{error}</div>}
                    <div className="quiz-level-cards">
                        <div className="quiz-level-card" onClick={() => startQuiz('easy')}>
                            <h3>{text.simple || 'Simple'}</h3>
                            <p>{text.simpleDesc || '5 straightforward questions based on foundational science principles.'}</p>
                            <div className="quiz-card-timer-badge">
                                ⏱️ 5 {text.mins || 'Mins'}
                            </div>
                            <button className="quiz-start-btn easy">{text.playSimple || 'Play Simple'}</button>
                        </div>
                        <div className="quiz-level-card" onClick={() => startQuiz('medium')}>
                            <h3>{text.medium || 'Medium'}</h3>
                            <p>{text.mediumDesc || '10 moderately difficult questions testing your conceptual understanding.'}</p>
                            <div className="quiz-card-timer-badge">
                                ⏱️ 15 {text.mins || 'Mins'}
                            </div>
                            <button className="quiz-start-btn medium">{text.playMedium || 'Play Medium'}</button>
                        </div>
                        <div className="quiz-level-card" onClick={() => startQuiz('hard')}>
                            <h3>{text.hard || 'Hard'}</h3>
                            <p>{text.hardDesc || '20 advanced, application-based questions for a real challenge.'}</p>
                            <div className="quiz-card-timer-badge">
                                ⏱️ 30 {text.mins || 'Mins'}
                            </div>
                            <button className="quiz-start-btn hard">{text.playHard || 'Play Hard'}</button>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button className="quiz-leaderboard-trigger-btn" onClick={() => setShowLeaderboardModal(true)}>
                            🏆 {text.viewLeaderboard || 'View Global Leaderboard'}
                        </button>
                    </div>
                </div>
            )}

            {showLeaderboardModal && (
                <div className="quiz-review-modal-overlay">
                    <div className="quiz-review-modal quiz-leaderboard-modal" style={{ padding: '1rem 2.5rem 2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                            <button onClick={() => setShowLeaderboardModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: isDarkMode ? '#cbd5e1' : '#64748b' }}>✕</button>
                        </div>
                        {renderLeaderboard('Global')}
                    </div>
                </div>
            )}

            {loading && (
                <div className="quiz-initial-loading-container">
                    <div className="quiz-loading-orb-nexus">
                        <div className="quiz-brain-icon">🧠</div>
                        <div className="nexus-ring nexus-ring-1"></div>
                        <div className="nexus-ring nexus-ring-2"></div>
                        <div className="nexus-ring nexus-ring-3"></div>
                        <div className="nexus-orbit"></div>
                    </div>
                </div>
            )}

            {quizData && (
                <div className="quiz-test-container">
                    <div className="quiz-sticky-header">
                        <div className="quiz-header-top">
                            <h2>{difficulty === 'easy' ? (text.easyQuiz || 'Easy Quiz') : difficulty === 'medium' ? (text.mediumQuiz || 'Medium Quiz') : (text.hardQuiz || 'Hard Quiz')}</h2>
                            <div className="quiz-header-actions">
                                <div className={`quiz-timer ${timeLeft < 60 ? 'timer-danger' : ''}`}>⏱️ {text.timeLeft || 'Time Left'}: {formatTime(timeLeft)}</div>
                                <button className="quiz-exit-btn" onClick={resetQuiz}>✕ {text.exit || 'Exit'}</button>
                            </div>
                        </div>
                        {allTopics.length > 0 && (
                            <div className="quiz-topics-bar">
                                <strong>{text.topicsIncluded || 'Topics Included:'}</strong>
                                <div className="quiz-topics-chips-container">
                                    <button
                                        className={`quiz-topic-filter-btn ${activeTopic === 'All' ? 'active' : ''}`}
                                        onClick={() => startQuiz(difficulty, 'All')}
                                    >
                                        {text.all || 'All'}
                                    </button>
                                    {allTopics.map((topic, i) => (
                                        <button
                                            key={i}
                                            className={`quiz-topic-filter-btn ${activeTopic === topic ? 'active' : ''}`}
                                            onClick={() => startQuiz(difficulty, topic)}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="quiz-questions-list">
                        {isTopicLoading ? (
                            <div className="quiz-shimmer-container">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="quiz-question-shimmer">
                                        <div className="shimmer-title"></div>
                                        <div className="shimmer-options">
                                            {[1, 2, 3, 4].map(j => <div key={j} className="shimmer-opt"></div>)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            quizData.quiz
                                .filter(q => activeTopic === 'All' || q.parentTopic === activeTopic)
                                .map((q, qIndex) => (
                                    <div key={qIndex} id={`question-${qIndex}`} className="quiz-question-card">
                                        <h3 className="quiz-q-title"><span>{qIndex + 1}.</span> {q.question}</h3>
                                        <div className="quiz-q-options">
                                            {q.options.map((opt, oIndex) => {
                                                const isSelected = selectedAnswers[qIndex] === opt;
                                                const isCorrect = q.answer === opt;
                                                let btnClass = "quiz-opt-btn" + (isSelected ? " selected" : "");
                                                if (quizSubmitted) {
                                                    if (isCorrect) btnClass += " correct-ans";
                                                    else if (isSelected && !isCorrect) btnClass += " wrong-ans";
                                                    else btnClass += " disabled-ans";
                                                }
                                                return (
                                                    <button key={oIndex} className={btnClass} onClick={() => handleOptionSelect(qIndex, opt)} disabled={quizSubmitted}>
                                                        <div className="opt-indicator"></div>
                                                        {opt}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {quizSubmitted && (
                                            <div className={`quiz-q-explanation ${selectedAnswers[qIndex] === q.answer ? 'expl-correct' : 'expl-wrong'}`}>
                                                <h4>{selectedAnswers[qIndex] === q.answer ? `✅ ${text.correct || 'Correct'}` : `❌ ${text.incorrect || 'Incorrect'}`}</h4>
                                                <p>{q.explanation}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                        )}
                    </div>
                    {!isTransitioning && !quizSubmitted ? (
                        <div className="quiz-submit-section">
                            <button className="quiz-final-submit-btn" onClick={trySubmitQuiz}>{text.submitQuiz || 'Submit Quiz'}</button>
                        </div>
                    ) : !isTransitioning && (
                        <div className="quiz-results-banner">
                            <h2>{text.quizComplete || 'Quiz Completed!'}</h2>
                            <div className="quiz-final-score">
                                <span className="score-num">{score}</span> / <span className="score-total">{quizData.quiz.length}</span>
                            </div>

                            <p className="quiz-result-feedback" style={{
                                color: isDarkMode ? '#94a3b8' : '#64748b',
                                marginTop: '1.5rem',
                                fontSize: '1.05rem',
                                fontWeight: '400'
                            }}>
                                {text.niceTry || 'Nice try! Review the explanations above to learn more.'}
                            </p>

                            <hr style={{
                                border: 'none',
                                borderTop: isDarkMode ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.1)',
                                margin: '2rem 0',
                                width: '100%'
                            }} />

                            {/* Topics to Review Section */}
                            {score < quizData.quiz.length && (
                                <div className="quiz-review-topics-section" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                                    <p style={{ color: isDarkMode ? '#cbd5e1' : '#64748b', marginBottom: '1.5rem', fontWeight: '500' }}>
                                        {text.topicsToReview || 'Topics to review based on your missed answers:'}
                                    </p>
                                    <div className="quiz-review-chips" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                                        {Array.from(new Set(
                                            quizData.quiz
                                                .filter((q, idx) => selectedAnswers[idx] !== q.answer)
                                                .map(q => q.topic || q.parentTopic || 'General')
                                        )).map((topic, tidx) => (
                                            <button
                                                key={tidx}
                                                className="quiz-review-chip"
                                                onClick={() => navigate('/', { state: { autoSearch: topic } })}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.6rem 1.2rem',
                                                    borderRadius: '2rem',
                                                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                                                    background: isDarkMode ? '#1e293b' : 'white',
                                                    color: '#3b82f6',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.1rem' }}>🔍</span>
                                                {text.learnAbout || 'Learn about'} {topic}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {renderLeaderboard(difficulty)}

                            <div className="quiz-result-actions" style={{ marginTop: '2.5rem' }}>
                                <button className="quiz-final-submit-btn" onClick={resetQuiz}>{text.playAgain || 'Play Another Quiz'}</button>
                                <button className="quiz-secondary-btn" onClick={() => navigate('/')}>{text.backToSearch || 'Back to Search'}</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showReviewModal && quizData && (
                <div className="quiz-review-modal-overlay">
                    <div className="quiz-review-modal">
                        <h3>{text.incompleteQuiz || 'Incomplete Quiz'}</h3>
                        <p>{text.unansweredQuestionsWarning || 'You have not answered all the questions yet.'}</p>

                        <div className="review-status-container">
                            <div className="status-cols">
                                <div className="status-col">
                                    <h4>{text.answered || 'Answered'}</h4>
                                    <div className="q-status-grid">
                                        {quizData.quiz.map((_, i) => (
                                            selectedAnswers[i] && (
                                                <button key={i} className="q-status-pill answered" onClick={() => jumpToQuestion(i)}>
                                                    Q{i + 1}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                </div>
                                <div className="status-col">
                                    <h4>{text.unanswered || 'Unanswered'}</h4>
                                    <div className="q-status-grid">
                                        {quizData.quiz.map((_, i) => (
                                            !selectedAnswers[i] && (
                                                <button key={i} className="q-status-pill unanswered" onClick={() => jumpToQuestion(i)}>
                                                    Q{i + 1}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="quiz-review-actions">
                            <button className="quiz-secondary-btn" onClick={() => setShowReviewModal(false)}>{text.backToQuiz || 'Back to Quiz'}</button>
                            <button className="quiz-exit-btn" onClick={handleQuizSubmit} style={{ background: '#fef2f2', color: '#ef4444' }}>{text.submitAnyway || 'Submit Anyway'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Prompt Overlay */}
            {showFsPrompt && (
                <div className="quiz-fs-overlay">
                    <div className="quiz-fs-modal">
                        <div className="quiz-fs-icon-wrapper">
                            <svg className="quiz-fs-main-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                            </svg>
                        </div>
                        <h2 className="quiz-fs-title">{text.fullScreenRequired || 'Full Screen Required'}</h2>
                        <p className="quiz-fs-desc">{text.fsWaitDesc || 'To ensure a distraction-free and fair exam environment, this quiz must be taken in full screen mode.'}</p>

                        <div className="fs-rules-grid">
                            <div className="fs-rule-item">
                                <div className="rule-icon-box">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                </div>
                                <span>{text.noSwitchingTabs || 'No switching tabs'}</span>
                            </div>
                            <div className="fs-rule-item">
                                <div className="rule-icon-box">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /><path d="m15 9-6 6m0-6 6 6" /></svg>
                                </div>
                                <span>{text.noExitingFs || 'No exiting full screen'}</span>
                            </div>
                            <div className="fs-rule-item">
                                <div className="rule-icon-box">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                </div>
                                <span>{text.timerWontStop || 'Timer will not stop'}</span>
                            </div>
                        </div>

                        <div className="fs-action-btns">
                            <button className="quiz-fs-btn-primary" onClick={enterFsAndStart}>
                                {text.enterFsStart || 'Enter Full Screen & Start'}
                            </button>
                            <button className="quiz-fs-btn-secondary" onClick={() => { setShowFsPrompt(false); setPendingStart(null); }}>
                                {text.cancel || 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proctoring Warning Overlay */}
            {quizData && !quizSubmitted && !isFullScreen && (
                <div className="quiz-fs-overlay proctor-warning">
                    <div className="quiz-fs-modal">
                        <div className="quiz-fs-icon-wrapper warning">
                            <svg className="quiz-fs-main-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h2 className="proctor-alert-title">{text.proctorAlert || 'Proctor Alert!'}</h2>
                        <p className="proctor-alert-desc">{text.exitedFsWarning || 'You have exited full screen mode. This is a violation of the exam rules.'}</p>
                        <p className="proctor-return-desc">{text.returnToFsDesc || 'Please return to full screen immediately to continue your exam.'}</p>
                        <div className="fs-action-btns">
                            <button className="quiz-fs-btn-primary" onClick={() => document.documentElement.requestFullscreen()}>{text.returnToFs || 'Return to Full Screen'}</button>
                            <button className="quiz-exit-btn" onClick={resetQuiz}>{text.exitExam || 'Exit Exam'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
