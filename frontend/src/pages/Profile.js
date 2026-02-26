import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CustomSelect from '../components/CustomSelect';
import './Auth.css';


export default function Profile({ onLogout, language, setLanguage, t }) {
  const [data, setData] = useState(null);
  const [review, setReview] = useState({ rating: 0, comment: '' });
  const [editingReview, setEditingReview] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', username: '', language: 'en' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const text = t || {};

  const fetchReview = async () => {
    try {
      const res = await api.get('/review');
      if (res.data) {
        setReview({ id: res.data.id, rating: res.data.rating, comment: res.data.comment || '' });
      }
    } catch (e) {

    }
  };

  const submitReview = async () => {
    setSearchLoading(true);
    setReviewMessage('');
    try {
      await api.post('/review', { rating: review.rating, comment: review.comment });
      setReviewMessage('✅ Review Updated Successfully!');
      await fetchReview();

      setTimeout(() => setReviewMessage(''), 3000);
    } catch (e) {
      setReviewMessage('❌ Failed to submit review.');
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await api.get('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      setForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        username: res.data.username || '',
        language: res.data.language || 'en'
      });
      try {
        sessionStorage.setItem('profileCache', JSON.stringify(res.data));
      } catch { }
    } catch (e) {
      setError(text.errorGeneric || 'Failed to load profile');
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
          username: v.username || '',
          language: v.language || 'en'
        });
      } catch { }
    }
    fetchMe();
    fetchReview();
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
      if (form.language) {
        setLanguage(form.language);
      }
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
          <h2 className="auth-title">{text.profile || 'Profile'}</h2>
        </div>
        <p>{text.loading || 'Loading...'}</p>
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
        <h2 className="auth-title">{text.profile || 'Profile'}</h2>
      </div>

      {!edit ? (
        <div className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label className="form-label">{text.username || 'Username'}</label>
            <div className="form-input">{data.username || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">{text.email || 'Email'}</label>
            <div className="form-input">{data.email || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">{text.role || 'Role'}</label>
            <div className="form-input">{data.role}</div>
          </div>
          <div className="form-group">
            <label className="form-label">{text.firstName || 'First Name'}</label>
            <div className="form-input">{data.first_name || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">{text.lastName || 'Last Name'}</label>
            <div className="form-input">{data.last_name || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">{text.language || 'Language'}</label>
            <div className="form-input">{data.language || 'en'}</div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="first_name" className="form-label">{text.firstName || 'First Name'}</label>
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
            <label htmlFor="last_name" className="form-label">{text.lastName || 'Last Name'}</label>
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
            <label htmlFor="username" className="form-label">{text.username || 'Username'}</label>
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
          <div className="form-group">
            <label htmlFor="language" className="form-label">{text.language || 'Language'}</label>
            <CustomSelect
              name="language"
              className="language-select"
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'te', label: 'Telugu' },
                { value: 'hi', label: 'Hindi' }
              ]}
              disabled={loading}
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={loading} className="auth-button save-btn">
              {loading ? (text.saving || 'Saving...') : (text.saveChanges || 'Save Changes')}
            </button>
            <button type="button" className="nav-button logout-btn" onClick={() => setEdit(false)}>
              {text.cancel || 'Cancel'}
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
          {text.back || 'Back'}
        </button>
        <button
          className="auth-button"
          onClick={() => setEdit(!edit)}
          disabled={loading}
        >
          {edit ? (text.closeEdit || 'Close Edit') : (text.editProfile || 'Edit Profile')}
        </button>
        <button
          className="nav-button logout-btn"
          onClick={() => { onLogout(); navigate('/'); }}
          disabled={loading}
          style={{ background: '#ef4444', color: 'white', border: 'none' }}
        >
          {text.logout || 'Logout'}
        </button>
      </div>

      <div className="review-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px dashed #e2e8f0' }}>
        <h3 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
          {text.rateApp || 'Rate This App'}
        </h3>

        {!review.id || editingReview ? (
          <>
            <div className="review-card">
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn ${star <= (review.rating || 0) ? 'filled' : ''}`}
                    onClick={() => setReview({ ...review, rating: star })}
                    title={`${star} Stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="rating-label">
                {review.rating === 1 ? (text.poor || 'Poor') :
                  review.rating === 2 ? (text.fair || 'Fair') :
                    review.rating === 3 ? (text.good || 'Good') :
                      review.rating === 4 ? (text.veryGood || 'Very Good') :
                        review.rating === 5 ? (text.excellent || 'Excellent!') : (text.tapStarToRate || 'Tap a star to rate')}
              </p>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label className="form-label">{text.writeReview || 'Write a Review (Optional)'}</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder={text.tellUsWhatYouThink || "Tell us what you think..."}
                value={review.comment}
                onChange={(e) => setReview({ ...review, comment: e.target.value })}
                disabled={searchLoading}
              ></textarea>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="auth-button save-btn"
                onClick={submitReview}
                disabled={searchLoading || review.rating === 0}
                style={{ flex: 1 }}
              >
                {searchLoading ? (text.submitting || 'Submitting...') : (reviewMessage.includes('Success') ? (text.updated || 'Updated!') : (review.id ? (text.updateReview || 'Update Review') : (text.submitReview || 'Submit Review')))}
              </button>
              {review.id && (
                <button
                  className="nav-button logout-btn"
                  onClick={() => { setEditingReview(false); fetchReview(); }}
                  style={{ flex: 1 }}
                >
                  {text.cancel || 'Cancel'}
                </button>
              )}
            </div>
            {reviewMessage && <p style={{ marginTop: '1rem', color: reviewMessage.includes('Success') ? 'green' : 'red' }}>{reviewMessage}</p>}
          </>
        ) : (
          <div className="review-card">
            <div className="star-rating" style={{ pointerEvents: 'none' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star-btn ${star <= (review.rating || 0) ? 'filled' : ''}`}
                  style={{ fontSize: '2.5rem' }}
                >
                  ★
                </span>
              ))}
            </div>
            {review.comment && (
              <p className="review-display-comment">
                "{review.comment}"
              </p>
            )}
            <button
              className="auth-button"
              onClick={() => setEditingReview(true)}
              style={{ marginTop: '1.5rem', width: '100%' }}
            >
              {text.editReview || 'Edit Review'}
            </button>
          </div>
        )}
      </div>
    </div >
  );
}
