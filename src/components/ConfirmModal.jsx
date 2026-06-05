import { handleBackdropClick } from '../utils/modalHelper';
import '../styles/theme.css';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'danger' // danger | warning | primary
}) => {
  if (!isOpen) return null;

  let btnClass = 'btn-danger';
  if (type === 'warning') btnClass = 'btn-primary';
  if (type === 'primary') btnClass = 'btn-primary';

  let iconColor = 'var(--danger)';
  let iconBg = 'var(--danger-light)';
  if (type === 'warning' || type === 'primary') {
    iconColor = 'var(--warning)';
    iconBg = 'var(--warning-light)';
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} {...handleBackdropClick(onClose)}>
      <div className="modal-content confirm-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-body confirm-modal-body">
          <div className="confirm-icon-wrapper" style={{ backgroundColor: iconBg, color: iconColor }}>
            {type === 'danger' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
          </div>
          
          <div className="confirm-info-wrapper">
            <h4 className="confirm-title">{title}</h4>
            <p className="confirm-message">{message}</p>
          </div>
        </div>

        <div className="modal-footer confirm-modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {cancelText}
          </button>
          <button type="button" className={`btn ${btnClass}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        .confirm-modal-content {
          max-width: 440px;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .confirm-modal-body {
          padding: 24px 24px 16px 24px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .confirm-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .confirm-info-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .confirm-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .confirm-message {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        .confirm-modal-footer {
          padding: 14px 24px;
          background-color: #f8fafc;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
