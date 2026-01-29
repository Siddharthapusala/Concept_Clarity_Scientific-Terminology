import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Home.css';
export default function Home({ isAuthenticated }) {
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
  const limit = 2;
  const [isRecording, setIsRecording] = useState(false);
  const handleSearch = async (e, termOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const query = termOverride || searchTerm;
    if (!query.trim()) {
      setError('Please enter a scientific term to search');
      return;
    }
    if (!isAuthenticated && anonCount >= limit) {
      navigate('/login', { state: { message: "You've reached your free limit. Please login to continue." } });
      return;
    }
    setLoading(true);
    setError('');
    setResult('');
    setLevels(null);
    setExamples([]);
    setRelatedWords([]);
    try {
      const url = isAuthenticated
        ? `/search?q=${encodeURIComponent(query)}&level=${encodeURIComponent(level)}`
        : `/search?q=${encodeURIComponent(query)}&level=${encodeURIComponent('easy')}`;
      const res = await api.get(url);
      const def = res.data.definition || res.data.message;
      setResult(typeof def === 'string' ? def : '');
      setLevels(null);
      if (Array.isArray(res.data.examples)) {
        const validExamples = res.data.examples.filter(ex => ex && ex.trim().length > 10 && ex.toLowerCase() !== 'n/a' && !ex.toLowerCase().includes('example'));
        setExamples(validExamples);
      } else {
        setExamples([]);
      }
      if (Array.isArray(res.data.related_words)) {
        setRelatedWords(res.data.related_words);
      } else {
        setRelatedWords([]);
      }
      if (!isAuthenticated) {
        const next = anonCount + 1;
        setAnonCount(next);
        sessionStorage.setItem('anonSearchCount', String(next));
      }
    } catch (err) {
      setError('Failed to fetch definition. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };
  const recognitionRef = useRef(null);
  const startVoiceSearch = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice search is not supported in this browser.');
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    const recog = new SR();
    recognitionRef.current = recog;
    recog.lang = 'en-US';
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
      const text = e.results[0][0].transcript || '';
      if (text) {
        setSearchTerm(text);
        handleSearch(null, text);
      }
    };
    recog.onerror = (e) => {
      console.error('Voice error:', e.error);
      setIsRecording(false);
      recognitionRef.current = null;
      switch (e.error) {
        case 'no-speech':
          setError('No speech was detected. Please try again.');
          break;
        case 'audio-capture':
          setError('No microphone was found. Ensure it is plugged in.');
          break;
        case 'not-allowed':
          setError('Microphone permission blocked. Please allow access.');
          break;
        case 'network':
          setError('Network error. Voice recognition requires internet connection.');
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
  const popularTerms = [
    'Photosynthesis',
    'Quantum Physics',
    'DNA Replication',
    'Black Hole',
    'Climate Change',
    'Artificial Intelligence'
  ];
  const speakAnswer = () => {
    const synth = window.speechSynthesis;
    if (!synth || !result) return;
    if (synth.speaking) {
      synth.cancel();
      return;
    }
    const utter = new SpeechSynthesisUtterance(result);
    utter.lang = 'en-US';
    synth.speak(utter);
  };
  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-icon">🧠</span>
            ConceptClarity
          </h1>
          <p className="hero-subtitle">
            Unlock the mysteries of science with clear, concise explanations
          </p>
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for a scientific concept..."
                className="search-input"
              />
              <button type="submit" disabled={loading} className="search-button">
                {loading ? '🔍' : 'Search'}
              </button>
              {isAuthenticated && (
                <>
                  <button
                    type="button"
                    disabled={loading}
                    className={`mic-button ${isRecording ? 'recording' : ''}`}
                    onClick={startVoiceSearch}
                    title="Voice Search"
                  >
                    🎙️
                  </button>
                </>
              )}
            </div>
          </form>
          {loading && <div className="loading-message">Searching for scientific explanation...</div>}
          {isAuthenticated && (
            <div className="level-selector">
              <button className={`level-btn ${level === 'easy' ? 'active' : ''}`} onClick={() => setLevel('easy')}>
                Simple
              </button>
              <button className={`level-btn ${level === 'medium' ? 'active' : ''}`} onClick={() => setLevel('medium')}>
                Medium
              </button>
              <button className={`level-btn ${level === 'hard' ? 'active' : ''}`} onClick={() => setLevel('hard')}>
                Hard
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
            </div>
            <div className="result-content">
              <div className="result-line definition-block">
                <div className="line-header">
                  <span className="label-title">Definition:</span>
                  <button type="button" className="speaker-btn" title="Read Answer" onClick={speakAnswer}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                  </button>
                </div>
                <div className="line-text">{result}</div>
              </div>
              {examples && examples.length > 0 && examples.some(ex => ex && ex.trim().length > 10) ? (
                <div className="result-line example-block">
                  <div className="line-header">
                    <span className="label-title">Examples:</span>
                  </div>
                  <ul className="examples-list line-text">
                    {examples.filter(ex => ex && ex.trim().length > 10).map((ex, idx) => (
                      <li key={idx}>{ex}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {relatedWords && relatedWords.length > 0 && (
                <div className="result-line related-block">
                  <div className="line-header">
                    <span className="label-title">Related Words:</span>
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
