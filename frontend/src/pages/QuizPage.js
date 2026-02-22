import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './QuizPage.css';

export default function QuizPage({ isDarkMode, language }) {
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
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [showExtendedLeaderboard, setShowExtendedLeaderboard] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchLeaderboard('');

        if (quizData && !quizSubmitted && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && quizData && !quizSubmitted) {
            handleQuizSubmit();
        }
    }, [timeLeft, quizData, quizSubmitted]);

    const startQuiz = async (level, specificTopic = null) => {
        setDifficulty(level);

        if (quizData) {
            setIsTransitioning(true);
        } else {
            setLoading(true);
        }

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

            if (res.data.status === 'success' && res.data.quiz.length > 0) {
                setQuizData(res.data);

                if (!specificTopic || specificTopic === 'All') {
                    setAllTopics(res.data.terms_used);
                }

                setActiveTopic(specificTopic || 'All');
                setSelectedAnswers({});
                setScore(0);
                setQuizSubmitted(false);

                if (level === 'easy') setTimeLeft(5 * 60);
                else if (level === 'medium') setTimeLeft(15 * 60);
                else setTimeLeft(30 * 60);
            } else {
                setError('Quiz generation failed. Please try again.');
            }
        } catch (err) {
            console.error(err);
            setError('Error generating quiz. Server might be busy.');
        } finally {
            setLoading(false);
            setIsTransitioning(false);
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

    const handleQuizSubmit = async () => {
        if (quizSubmitted) return;
        setShowReviewModal(false);

        let newScore = 0;
        quizData.quiz.forEach((q, idx) => {
            if (selectedAnswers[idx] === q.answer) {
                newScore += 1;
            }
        });

        setScore(newScore);
        setQuizSubmitted(true);

        try {
            const token = localStorage.getItem('token');

            let initialTime = 0;
            if (difficulty === 'easy') initialTime = 5 * 60;
            else if (difficulty === 'medium') initialTime = 15 * 60;
            else initialTime = 30 * 60;

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
        } catch (err) {
            console.error("Failed to save quiz score", err);
        }
    };

    const resetQuiz = () => {
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

        // Reorder top 3 for podium visualization: 2, 1, 3
        const podiumOrder = [];
        if (top3[1]) podiumOrder.push({ ...top3[1], podiumRank: 2, originIndex: 1 });
        if (top3[0]) podiumOrder.push({ ...top3[0], podiumRank: 1, originIndex: 0 });
        if (top3[2]) podiumOrder.push({ ...top3[2], podiumRank: 3, originIndex: 2 });

        return (
            <div className="quiz-leaderboard-section">
                <h3>🏆 Top 10 {titlePrefix} Commanders</h3>
                {loadingLeaderboard ? (
                    <p style={{ color: '#64748b' }}>Pulling ranks...</p>
                ) : leaderboard.length > 0 ? (
                    <div className="quiz-leaderboard-list-wrapper">
                        {podiumOrder.length > 0 && (
                            <div className="quiz-podium-container">
                                {podiumOrder.map((lb) => {
                                    const lbScorePercent = Math.round((lb.score / lb.total_questions) * 100);
                                    return (
                                        <div key={`podium-${lb.id}`} className={`quiz-podium-item podium-rank-${lb.podiumRank}`}>
                                            <div className="podium-avatar">{lb.podiumRank === 1 ? '👑' : lb.podiumRank === 2 ? '🥈' : '🥉'}</div>
                                            <div className="podium-name-wrapper" title={lb.username}>
                                                {lb.username}
                                            </div>
                                            <div className="podium-bar">
                                                <span className="podium-score">{lb.score}/{lb.total_questions}</span>
                                                <span className="podium-score-percent">({lbScorePercent}%)</span>
                                                <div className="podium-rank-number">{lb.podiumRank}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {rest.length > 0 && (
                            <div className="quiz-leaderboard-actions" style={{ textAlign: 'center', marginTop: '1rem' }}>
                                {!showExtendedLeaderboard ? (
                                    <button
                                        className="quiz-view-all-btn"
                                        onClick={() => setShowExtendedLeaderboard(true)}
                                    >
                                        View All Rankings
                                    </button>
                                ) : (
                                    <div className="quiz-leaderboard-scrollable">
                                        {rest.map((lb, idx) => {
                                            const actualRank = idx + 4;
                                            const lbScorePercent = Math.round((lb.score / lb.total_questions) * 100);
                                            return (
                                                <div key={lb.id} className="quiz-leaderboard-item rest">
                                                    <span className="lb-rank">#{actualRank}</span>
                                                    <span className="lb-name">{lb.username}</span>
                                                    <div className="lb-stats">
                                                        <span className="lb-score">{lb.score}/{lb.total_questions} ({lbScorePercent}%)</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <button
                                            className="quiz-view-all-btn"
                                            style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.9rem' }}
                                            onClick={() => setShowExtendedLeaderboard(false)}
                                        >
                                            Show Less
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <p style={{ color: '#64748b', textAlign: 'center' }}>No scores recorded yet. Be the first to conquer!</p>
                )}
            </div>
        );
    };

    return (
        <div className={`quiz-page-container ${isDarkMode ? 'dark-mode' : ''}`}>
            {!quizData && !loading && (
                <div className="quiz-setup-card">
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem', width: '100%' }}>
                        <button
                            className="quiz-start-btn"
                            style={{
                                padding: '0.6rem 1.2rem',
                                fontSize: '0.9rem',
                                width: 'auto',
                                background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                                color: 'white'
                            }}
                            onClick={() => navigate('/')}
                        >
                            ← Back to Search
                        </button>
                    </div>
                    <h1 className="quiz-page-title">Concept Quiz Challenge</h1>
                    <p className="quiz-page-subtitle">Test your knowledge with a custom quiz built from your recent searches!</p>
                    {error && <div className="quiz-page-error">{error}</div>}

                    <div className="quiz-level-cards">
                        <div className="quiz-level-card" onClick={() => startQuiz('easy')}>
                            <h3>Simple</h3>
                            <p>5 straightforward questions based on foundational science principles.</p>
                            <span className="quiz-timer-badge">⏱️ 5 Mins</span>
                            <button className="quiz-start-btn easy">Play Simple</button>
                        </div>

                        <div className="quiz-level-card" onClick={() => startQuiz('medium')}>
                            <h3>Medium</h3>
                            <p>10 moderately difficult questions testing your conceptual understanding.</p>
                            <span className="quiz-timer-badge">⏱️ 15 Mins</span>
                            <button className="quiz-start-btn medium">Play Medium</button>
                        </div>

                        <div className="quiz-level-card" onClick={() => startQuiz('hard')}>
                            <h3>Hard</h3>
                            <p>20 advanced, application-based questions for a real challenge.</p>
                            <span className="quiz-timer-badge">⏱️ 30 Mins</span>
                            <button className="quiz-start-btn hard">Play Hard</button>
                        </div>
                    </div>
                    <div className="quiz-setup-actions-container" style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button
                            className="quiz-leaderboard-trigger-btn"
                            onClick={() => setShowLeaderboardModal(true)}
                        >
                            🏆 View Global Leaderboard
                        </button>
                    </div>
                </div>
            )}

            {showLeaderboardModal && (
                <div className="quiz-review-modal-overlay">
                    <div className="quiz-review-modal quiz-leaderboard-modal" style={{ padding: '1rem 2.5rem 2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-1rem' }}>
                            <button
                                onClick={() => setShowLeaderboardModal(false)}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: isDarkMode ? '#cbd5e1' : '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>
                        {renderLeaderboard('Global')}
                    </div>
                </div>
            )}

            {loading && !isTransitioning && (
                <div className="quiz-initial-loading-container">
                    <div className="quiz-loading-orb-nexus">
                        <div className="quiz-brain-icon">🧠</div>
                        <div className="nexus-ring nexus-ring-1"></div>
                        <div className="nexus-ring nexus-ring-2"></div>
                        <div className="nexus-ring nexus-ring-3"></div>
                        <div className="nexus-orbit"></div>
                    </div>
                    <div className="quiz-loading-progress-bar">
                        <div className="quiz-loading-progress-fill"></div>
                    </div>
                </div>
            )}

            {quizData && (
                <div className="quiz-test-container">
                    <div className="quiz-sticky-header">
                        <div className="quiz-header-top">
                            <h2>{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Quiz</h2>
                            <div className="quiz-header-actions">
                                <div className={`quiz-timer ${timeLeft < 60 ? 'timer-danger' : ''}`}>
                                    ⏱️ Time Left: {formatTime(timeLeft)}
                                </div>
                                <button
                                    className="quiz-exit-btn"
                                    onClick={resetQuiz}
                                    title="Exit to Quiz Setup"
                                >
                                    ✕ Exit
                                </button>
                            </div>
                        </div>
                        <div className="quiz-topics-bar">
                            <strong>Topics Included:</strong>
                            <div className="quiz-topics-chips-container">
                                <button
                                    className={`quiz-topic-filter-btn ${activeTopic === 'All' ? 'active' : ''}`}
                                    onClick={() => startQuiz(difficulty, 'All')}
                                >
                                    All
                                </button>
                                {allTopics.map((term, i) => (
                                    <button
                                        key={i}
                                        className={`quiz-topic-filter-btn ${activeTopic === term ? 'active' : ''}`}
                                        onClick={() => startQuiz(difficulty, term)}
                                    >
                                        {term}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="quiz-questions-list">
                        {isTransitioning ? (
                            Array(difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20).fill(0).map((_, i) => (
                                <div key={i} className="quiz-question-card skeleton-card">
                                    <div className="skeleton-title"></div>
                                    <div className="quiz-q-options">
                                        <div className="quiz-opt-btn skeleton-btn"></div>
                                        <div className="quiz-opt-btn skeleton-btn"></div>
                                        <div className="quiz-opt-btn skeleton-btn"></div>
                                        <div className="quiz-opt-btn skeleton-btn"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            quizData.quiz.map((q, qIndex) => (
                                <div key={qIndex} id={`question-${qIndex}`} className="quiz-question-card">
                                    <h3 className="quiz-q-title"><span>{qIndex + 1}.</span> {q.question}</h3>

                                    <div className="quiz-q-options">
                                        {q.options.map((opt, oIndex) => {
                                            const isSelected = selectedAnswers[qIndex] === opt;
                                            const isCorrect = q.answer === opt;

                                            let btnClass = "quiz-opt-btn";
                                            if (isSelected) btnClass += " selected";

                                            if (quizSubmitted) {
                                                if (isCorrect) btnClass += " correct-ans";
                                                else if (isSelected && !isCorrect) btnClass += " wrong-ans";
                                                else btnClass += " disabled-ans";
                                            }

                                            return (
                                                <button
                                                    key={oIndex}
                                                    className={btnClass}
                                                    onClick={() => handleOptionSelect(qIndex, opt)}
                                                    disabled={quizSubmitted}
                                                >
                                                    <div className="opt-indicator"></div>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {quizSubmitted && (
                                        <div className={`quiz-q-explanation ${selectedAnswers[qIndex] === q.answer ? 'expl-correct' : 'expl-wrong'}`}>
                                            <h4>
                                                {selectedAnswers[qIndex] === q.answer
                                                    ? '✅ Correct'
                                                    : selectedAnswers[qIndex]
                                                        ? `❌ Incorrect (Correct: ${q.answer})`
                                                        : `⚠️ Unanswered (Correct: ${q.answer})`
                                                }
                                            </h4>
                                            <p>{q.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {!isTransitioning && !quizSubmitted ? (
                        <div className="quiz-submit-section">
                            <button
                                className="quiz-final-submit-btn"
                                onClick={trySubmitQuiz}
                            >
                                Submit Quiz
                            </button>
                        </div>
                    ) : (
                        !isTransitioning && (
                            <div className="quiz-results-banner">
                                <h2>Quiz Completed!</h2>
                                <div className="quiz-final-score">
                                    <span className="score-num">{score}</span>
                                    <span className="score-div">/</span>
                                    <span className="score-total">{quizData.quiz.length}</span>
                                </div>
                                <p className="score-message">
                                    {score === quizData.quiz.length ? "Incredible! Flawless victory." :
                                        score >= quizData.quiz.length / 2 ? "Well done. Keep studying to reach perfection." :
                                            "Nice try! Review the explanations above to learn more."}
                                </p>

                                {/* Topics to Learn Section */}
                                {score < quizData.quiz.length && (
                                    <div className="quiz-learn-more-section">
                                        <h3>Topics to review based on your missed answers:</h3>
                                        <div className="quiz-missed-topics">
                                            {Array.from(new Set(
                                                quizData.quiz
                                                    .filter((q, idx) => selectedAnswers[idx] !== q.answer)
                                                    .map(q => q.topic || "General Concepts")
                                            )).map((topic, i) => (
                                                <button
                                                    key={i}
                                                    className="missed-topic-chip"
                                                    onClick={() => {
                                                        // Navigate to home and trigger a search
                                                        navigate('/', { state: { autoSearch: topic } });
                                                    }}
                                                >
                                                    🔍 Learn about {topic}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Leaderboard Section */}
                                {renderLeaderboard(difficulty.charAt(0).toUpperCase() + difficulty.slice(1))}

                                <div className="quiz-result-actions">
                                    <button className="quiz-final-submit-btn" onClick={resetQuiz}>Play Another Quiz</button>
                                    <button className="quiz-secondary-btn" onClick={() => navigate('/')}>Back to Search</button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {showReviewModal && quizData && (
                <div className="quiz-review-modal-overlay">
                    <div className="quiz-review-modal">
                        <h3>Incomplete Quiz</h3>
                        <p>You have not answered all the questions yet.</p>

                        <div className="quiz-review-grid">
                            <div className="quiz-review-column">
                                <h4>Answered</h4>
                                <div className="quiz-review-pills">
                                    {quizData.quiz.map((_, i) => selectedAnswers[i] && (
                                        <button key={i} className="review-pill answered" onClick={() => jumpToQuestion(i)}>
                                            Q{i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="quiz-review-column">
                                <h4>Unanswered</h4>
                                <div className="quiz-review-pills">
                                    {quizData.quiz.map((_, i) => !selectedAnswers[i] && (
                                        <button key={i} className="review-pill unanswered" onClick={() => jumpToQuestion(i)}>
                                            Q{i + 1}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="quiz-review-actions">
                            <button className="quiz-secondary-btn" onClick={() => setShowReviewModal(false)}>Back to Quiz</button>
                            <button className="quiz-exit-btn" onClick={handleQuizSubmit} style={{ fontSize: '1.1rem', padding: '0.8rem 1.5rem' }}>Submit Anyway</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
