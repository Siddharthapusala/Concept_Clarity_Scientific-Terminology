import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import './Home.css';


export default function Home({ isAuthenticated, language, setLanguage, t }) {
  const text = t || {};
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
  const [videoId, setVideoId] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const limit = 2;

  const [isRecording, setIsRecording] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setResultLanguage(language);
  }, [language]);

  useEffect(() => {
    if (searchTerm && result && !loading) {
      handleSearch(null, searchTerm, resultLanguage);
    }
  }, [level]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (file) {
      setSelectedImage(file);
      analyzeImage(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    if (!loading) {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const analyzeImage = async (fileInput = null) => {
    const fileToAnalyze = fileInput || selectedImage;
    if (!fileToAnalyze) return;

    setLoading(true);
    setError('');
    setResult('');
    setLevels(null);
    setExamples([]);
    setRelatedWords([]);
    setRelatedWords([]);
    setVideoId(null);
    setImageUrl(null);

    const formData = new FormData();
    formData.append('file', fileToAnalyze);
    const currentLang = language;
    const currentLevel = level;

    try {
      const url = `/analyze_image?language=${encodeURIComponent(currentLang)}&level=${encodeURIComponent(currentLevel)}`;
      const res = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = res.data;
      if (data.source === 'error') {
        setError(data.definition || 'Failed to analyze image.');
      } else {
        setSearchTerm(data.term || 'Image Analysis');
        setResult(JSON.stringify(data));
        if (data.history_id) setHistoryId(data.history_id);
        if (data.related_words) setRelatedWords(data.related_words);
        if (data.video_id) setVideoId(data.video_id);
        if (data.image_url) setImageUrl(data.image_url);
        setShowImageModal(false);
      }

    } catch (err) {
      console.error("Image analysis error:", err);
      setError("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

    if (!langOverride) {
      setResult('');
      setLevels(null);
      setExamples([]);
      setRelatedWords([]);
      setVideoId(null);
      setImageUrl(null);
      setShowVideo(false);
    }

    try {
      let url = isAuthenticated
        ? `/search?q=${encodeURIComponent(query)}&level=${encodeURIComponent(level)}&language=${encodeURIComponent(searchLang)}&fetch_media=false`
        : `/search?q=${encodeURIComponent(query)}&level=${encodeURIComponent('easy')}&language=${encodeURIComponent(searchLang)}&fetch_media=false`;

      const res = await api.get(url);
      const def = res.data.definition || res.data.message;

      setResult(typeof def === 'string' ? def : '');
      setLevels(null);
      if (res.data.history_id) setHistoryId(res.data.history_id);
      setFeedback(0);
      setResultLanguage(searchLang);

      if (Array.isArray(res.data.examples)) {
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

      setLoading(false);

      api.get(`/search/media?q=${encodeURIComponent(query)}`)
        .then(mediaRes => {
          if (mediaRes.data.video_id) setVideoId(mediaRes.data.video_id);
          if (mediaRes.data.image_url) setImageUrl(mediaRes.data.image_url);
        })
        .catch(err => console.error("Media fetch error:", err));

    } catch (err) {
      setError(text.errorGeneric || 'Failed to fetch definition. Please try again.');
      console.error('Search error:', err);
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
      setError('Voice error: ' + e.error);
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
                  <button
                    type="button"
                    className="image-upload-btn"
                    onClick={() => setShowImageModal(true)}
                    title="Search by Image"
                  >
                    📷
                  </button>
                </>
              )}
            </div>
          </form>

          {showImageModal && (
            <div className="modal-overlay" onClick={closeImageModal}>
              <div className="lens-modal" onClick={e => e.stopPropagation()}>
                <div className="lens-header">
                  <h3>Search any image with Lens</h3>
                  <button className="close-modal" onClick={closeImageModal}>✕</button>
                </div>

                {loading ? (
                  <div className="drop-zone" style={{ border: 'none', background: 'white' }}>
                    <div className="upload-prompt-row" style={{ flexDirection: 'column', gap: '2rem' }}>
                      <div className="lens-icon-wrapper" style={{ animation: 'pulse 1.5s infinite' }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V6H20V18ZM15.96 11.96L13.21 15.63L11.25 13.03L8.5 16.68H19.5L15.96 11.96Z" fill="#4285F4" />
                        </svg>
                      </div>
                      <p style={{ fontSize: '1.2rem', color: '#1a73e8', fontWeight: '500' }}>Analyzing image...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      {!imagePreview ? (
                        <div className="upload-prompt-row">
                          <div className="lens-icon-wrapper">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 18H4V6H20V18ZM15.96 11.96L13.21 15.63L11.25 13.03L8.5 16.68H19.5L15.96 11.96Z" fill="#4285F4" />
                            </svg>
                          </div>
                          <p>Drag an image here or <span className="upload-link" onClick={() => fileInputRef.current.click()}>upload a file</span></p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      ) : (
                        <div className="preview-area">
                          <img src={imagePreview} alt="Preview" className="modal-preview-img" />
                          <button
                            className="remove-preview-btn"
                            onClick={() => {
                              setImagePreview(null);
                              setSelectedImage(null);
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {!imagePreview && (
                      <>
                        <div className="lens-separator">
                          <span>OR</span>
                        </div>

                        <div className="lens-footer">
                          <input
                            type="text"
                            placeholder="Paste image link"
                            className="lens-url-input"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (e.target.value) handleSearch(null, e.target.value);
                              }
                            }}
                          />
                          <button className="lens-search-btn" onClick={(e) => {
                            const input = e.target.previousSibling;
                            if (input && input.value) handleSearch(null, input.value);
                          }}>
                            Search
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {loading && !showImageModal && <div className="loading-message">{text.loading || 'Searching for scientific explanation...'}</div>}

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
            {showVideo && videoId ? (
              <div className="video-card-content">
                <div className="result-header">
                  <div className="result-header-top">
                    <h2>{searchTerm} - Video</h2>
                    <button
                      className="video-toggle-btn active"
                      onClick={() => setShowVideo(false)}
                      title="Back to Definition"
                    >
                      ❌ Close Video
                    </button>
                  </div>
                </div>
                <div className="video-container" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '1rem', marginTop: '1rem' }}>
                  <iframe
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            ) : (
              <>
                <div className="result-header">
                  <div className="result-header-top">
                    <h2>{searchTerm}</h2>
                    {videoId && (
                      <button
                        className="video-toggle-btn"
                        onClick={() => setShowVideo(true)}
                        title="Watch Video"
                      >
                        📺 Watch Video
                      </button>
                    )}
                  </div>
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
                    <div className="line-text">
                      {(() => {
                        try {
                          if (result && result.trim().startsWith('{')) {
                            const parsed = JSON.parse(result);
                            return (
                              <div className="structured-result">
                                {parsed.key_concept && (
                                  <div className="concept-block">
                                    <strong>Key Concept:</strong> {parsed.key_concept}
                                  </div>
                                )}
                                {parsed.definition && (
                                  <div className="def-sub-block">
                                    <strong>Definition:</strong> {parsed.definition}
                                  </div>
                                )}
                                {parsed.explanation && (
                                  <div className="expl-sub-block">
                                    <strong>Explanation:</strong>
                                    <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                                      {Array.isArray(parsed.explanation)
                                        ? parsed.explanation.map((line, i) => <li key={i}>{line}</li>)
                                        : <li>{parsed.explanation}</li>
                                      }
                                    </ul>
                                  </div>
                                )}
                                {parsed.real_world_application && (
                                  <div className="app-sub-block" style={{ marginTop: '1rem', fontStyle: 'italic', color: '#555' }}>
                                    <strong>Real World Application:</strong> {parsed.real_world_application}
                                  </div>
                                )}
                                {!parsed.key_concept && !parsed.definition && !parsed.explanation && JSON.stringify(parsed)}
                              </div>
                            );
                          }
                          return result;
                        } catch (e) {
                          return result;
                        }
                      })()}
                    </div>
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
                  {imageUrl && (
                    <div className="result-line image-section" style={{ marginTop: '2rem' }}>
                      <div className="line-header">
                        <span className="label-title">Related Image:</span>
                      </div>
                      <div className="image-container" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <img src={imageUrl} alt="Related concept" className="result-image-large" />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
