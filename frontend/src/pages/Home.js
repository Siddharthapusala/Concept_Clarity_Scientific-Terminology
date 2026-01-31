import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Home.css';
export default function Home({ isAuthenticated, language, setLanguage, t }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [result, setResult] = useState('');
  const [levels, setLevels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('easy');
  const navigate = useNavigate();
  const [examples, setExamples] = useState([]);
  const [relatedWords, setRelatedWords] = useState([]);
  const [anonCount, setAnonCount] = useState(() => {
    const v = sessionStorage.getItem('anonSearchCount');
    return v ? parseInt(v, 10) || 0 : 0;
  });
  const [resultLanguage, setResultLanguage] = useState(language);
  const [historyId, setHistoryId] = useState(null);
  const [feedback, setFeedback] = useState(0);

  // Sync resultLanguage with global language when global language changes
  useEffect(() => {
    setResultLanguage(language);
  }, [language]);

  // Re-fetch when level changes
  useEffect(() => {
    if (searchTerm && result && !loading) {
      handleSearch(null, searchTerm, resultLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const limit = 2;
  const [isRecording, setIsRecording] = useState(false);
  const text = t || {};

  const handleSearch = async (e, termOverride = null, langOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = termOverride || searchTerm;
    const searchLang = langOverride || language;

    if (!query.trim()) {
      setError('Please enter a scientific term to search');
      return;
    }
    if (!isAuthenticated && anonCount >= limit) {
      navigate('/login', { state: { message: text.guestLimit || "You've reached your free limit. Please login to continue." } });
      return;
    }
    if (langOverride) {
      setResultLanguage(langOverride);
    }

    setLoading(true);
    setError('');

    // Clear result only if it's a new search term
    if (!langOverride) {
      setResult('');
      setLevels(null);
      setExamples([]);
      setRelatedWords([]);
    }

    try {
      const url = isAuthenticated
        ? `/search?q=${encodeURIComponent(query)}&level=${encodeURIComponent(level)}&language=${encodeURIComponent(searchLang)}`
        : `/search?q=${encodeURIComponent(query)}&level=${encodeURIComponent('easy')}&language=${encodeURIComponent(searchLang)}`;
      const res = await api.get(url);
      const def = res.data.definition || res.data.message;
      setResult(typeof def === 'string' ? def : '');
      setLevels(null);
      if (res.data.history_id) {
        setHistoryId(res.data.history_id);
      }
      setFeedback(0);

      setResultLanguage(searchLang);

      if (Array.isArray(res.data.examples)) {
        // Relaxed validation: allow shorter examples (min 3 chars) and allow word "example"
        // This is important for non-English languages where words might be shorter or "example" might be valid context
        const validExamples = res.data.examples.filter(ex => ex && ex.trim().length > 3 && ex.toLowerCase() !== 'n/a');
        setExamples(validExamples);
      } else {
        setExamples([]);
      }
      if (Array.isArray(res.data.related_words)) {
        setRelatedWords(res.data.related_words);
      } else {
        setRelatedWords([]);
      }
      if (!isAuthenticated && !langOverride) {
        const next = anonCount + 1;
        setAnonCount(next);
        sessionStorage.setItem('anonSearchCount', String(next));
      }
    } catch (err) {
      setError(text.errorGeneric || 'Failed to fetch definition. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };
  const recognitionRef = useRef(null);
  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError(text.voiceError || 'Voice search is not supported in this browser.');
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    const recog = new SR();
    recognitionRef.current = recog;
    recog.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    if (isRecording) {
      recog.stop();
      return;
    }
    recog.onstart = () => {
      setIsRecording(true);
      setError('');
    };
    recog.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recog.onresult = (e) => {
      const textVal = e.results[0][0].transcript || '';
      if (textVal) {
        setSearchTerm(textVal);
        handleSearch(null, textVal);
      }
    };
    recog.onerror = (e) => {
      console.error('Voice error:', e.error);
      setIsRecording(false);
      recognitionRef.current = null;
      switch (e.error) {
        case 'no-speech':
          setError(text.noSpeech || 'No speech was detected. Please try again.');
          break;
        case 'audio-capture':
          setError(text.micError || 'No microphone was found. Ensure it is plugged in.');
          break;
        case 'not-allowed':
          setError(text.micBlocked || 'Microphone permission blocked. Please allow access.');
          break;
        case 'network':
          setError(text.networkError || 'Network error. Voice recognition requires internet connection.');
          break;
        default:
          setError('Voice recognition error: ' + e.error);
      }
    };
    try {
      recog.start();
    } catch (err) {
      setIsRecording(false);
      recognitionRef.current = null;
      setError('Could not start voice search.');
    }
  };

  const speakAnswer = () => {
    const synth = window.speechSynthesis;
    if (!synth || !result) return;
    if (synth.speaking) {
      synth.cancel();
      return;
    }
    const utter = new SpeechSynthesisUtterance(result);
    utter.lang = resultLanguage === 'hi' ? 'hi-IN' : resultLanguage === 'te' ? 'te-IN' : 'en-US';
    synth.speak(utter);
  };

  const submitFeedback = async (val) => {
    if (!historyId) return;
    try {
      await api.put(`/history/${historyId}/feedback`, { feedback: val });
      setFeedback(val);
    } catch (err) {
      console.error("Feedback failed", err);
    }
  };
  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-icon">🧠</span>
            {text.heroTitle || 'ConceptClarity'}
          </h1>
          <p className="hero-subtitle">
            {text.heroSubtitle || 'Unlock the mysteries of science with clear, concise explanations'}
          </p>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={text.searchPlaceholder || "Search for a scientific concept..."}
                className="search-input"
              />
              <button type="submit" disabled={loading} className="search-button">
                {loading ? '🔍' : text.searchButton || 'Search'}
              </button>
              {isAuthenticated && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    className={`mic-button ${isRecording ? 'recording' : ''}`}
                    onClick={startVoiceSearch}
                    title={text.voiceSearch || "Voice Search"}
                  >
                    🎙️
                  </button>
                </>
              )}
            </div>
          </form>
          {loading && <div className="loading-message">{text.loading || 'Searching for scientific explanation...'}</div>}
          {isAuthenticated && (
            <div className="level-selector">
              <button className={`level-btn ${level === 'easy' ? 'active' : ''}`} onClick={() => setLevel('easy')}>
                {text.simple || 'Simple'}
              </button>
              <button className={`level-btn ${level === 'medium' ? 'active' : ''}`} onClick={() => setLevel('medium')}>
                {text.medium || 'Medium'}
              </button>
              <button className={`level-btn ${level === 'hard' ? 'active' : ''}`} onClick={() => setLevel('hard')}>
                {text.hard || 'Hard'}
              </button>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
      {result && (
        <div className="result-section">
          <div className="result-card">
            <div className="result-header">
              <h2>{searchTerm}</h2>
              <div className="result-lang-options">
                {[
                  { code: 'en', label: 'English' },
                  { code: 'te', label: 'Telugu' },
                  { code: 'hi', label: 'Hindi' }
                ].map(opt => (
                  <button
                    key={opt.code}
                    className={`lang-chip ${resultLanguage === opt.code ? 'active' : ''}`}
                    onClick={() => handleSearch(null, searchTerm, opt.code)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="result-content">
              <div className="result-line definition-block">
                <div className="line-header">
                  <span className="label-title">{text.definition || 'Definition:'}</span>
                  <button type="button" className="speaker-btn" title="Read Answer" onClick={speakAnswer}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                  </button>
                  {isAuthenticated && historyId && (
                    <div className="feedback-actions">
                      <button
                        className={`feedback-btn ${feedback === 1 ? 'active' : ''}`}
                        onClick={() => submitFeedback(1)}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        className={`feedback-btn ${feedback === -1 ? 'active' : ''}`}
                        onClick={() => submitFeedback(-1)}
                        title="Not Helpful"
                      >
                        👎
                      </button>
                    </div>
                  )}
                </div>
                <div className="line-text">{result}</div>
              </div>
              {examples && examples.length > 0 && examples.some(ex => ex && ex.trim().length > 3) ? (
                <div className="result-line example-block">
                  <div className="line-header">
                    <span className="label-title">{text.examples || 'Examples:'}</span>
                  </div>
                  <ul className="examples-list line-text">
                    {examples.filter(ex => ex && ex.trim().length > 3).map((ex, idx) => (
                      <li key={idx}>{ex}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {relatedWords && relatedWords.length > 0 && (
                <div className="result-line related-block">
                  <div className="line-header">
                    <span className="label-title">{text.relatedWords || 'Related Words:'}</span>
                  </div>
                  <div className="related-words-container">
                    {relatedWords.map((word, idx) => (
                      <button
                        key={idx}
                        className="related-word-chip"
                        onClick={() => {
                          setSearchTerm(word);
                          handleSearch(null, word);
                        }}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
