import React from 'react';
import './HistoryModal.css';
const HistoryModal = ({ history, onClose, onDeleteItem, onClearAll }) => {
  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal-content" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h3>Search History</h3>
          <div className="history-actions">
            <button className="clear-btn" onClick={onClearAll}>Clear All</button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <p className="no-history">No search history yet.</p>
          ) : (
            history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-query">{item.query}</div>
                <div className="history-result">{item.result}</div>
                <div className="history-date">{new Date(item.created_at).toLocaleString()}</div>
                <button className="delete-btn" onClick={() => onDeleteItem(item.id)}>Delete</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default HistoryModal;
