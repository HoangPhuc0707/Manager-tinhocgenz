import { useState } from 'react';
import { login } from '../services/db';
import '../styles/theme.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.message || 'Đăng nhập thất bại. Vui lòng thử lại!');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối!');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-bg-glow-1"></div>
      <div className="login-bg-glow-2"></div>
      
      <div className="login-card">
        <div className="login-header">
          <img src="/src/assets/logo_vertical.png" alt="Tin Học GenZ Logo" className="login-logo" />
          <h2 className="login-title">Hệ thống Quản lý Học tập</h2>
          <p className="login-subtitle">Chào mừng bạn trở lại với Tin Học GenZ</p>
        </div>

        {error && (
          <div className="login-error-alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Tên đăng nhập / Email</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </span>
              <input
                id="username"
                type="text"
                className="form-control"
                placeholder="Nhập tên đăng nhập hoặc email..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Mật khẩu</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label="Toggle Password Visibility"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-submit-btn" disabled={loading}>
            {loading ? (
              <span className="login-spinner"></span>
            ) : (
              'Đăng nhập hệ thống'
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>Website: <a href="https://tinhocgenz.io.vn" target="_blank" rel="noreferrer">tinhocgenz.io.vn</a></span>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          min-height: 100dvh;
          width: 100%;
          background-color: #030712;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }

        .login-bg-glow-1 {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(3, 7, 18, 0) 70%);
          top: -150px;
          left: -100px;
          z-index: 1;
        }

        .login-bg-glow-2 {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, rgba(3, 7, 18, 0) 70%);
          bottom: -200px;
          right: -100px;
          z-index: 1;
        }

        .login-card {
          width: 100%;
          max-width: 380px;
          background: rgba(17, 24, 39, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 24px 30px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .login-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          margin-bottom: 2px;
          filter: drop-shadow(0 0 12px rgba(37, 99, 235, 0.25));
        }

        .login-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .login-subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
          margin: 0;
        }

        .login-error-alert {
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          padding: 10px 14px;
          color: #ef4444;
          font-size: 0.78rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: shake 0.3s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: #6b7280;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .input-with-icon .form-control {
          padding-left: 42px;
          background-color: rgba(17, 24, 39, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          border-radius: 8px;
          font-size: 0.85rem;
          height: 42px;
          width: 100%;
          transition: all 0.2s ease;
        }

        .input-with-icon .form-control:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.18);
          background-color: rgba(17, 24, 39, 0.95);
        }

        .password-toggle-btn {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 0;
        }

        .password-toggle-btn:hover {
          color: #ffffff;
        }

        .login-submit-btn {
          height: 42px;
          width: 100%;
          font-weight: 700;
          font-size: 0.85rem;
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border: none;
          box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2);
          transition: all 0.2s ease;
        }

        .login-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(37, 99, 235, 0.35);
        }

        .login-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #ffffff;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          font-size: 0.72rem;
          color: #6b7280;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 12px;
        }

        .login-footer a {
          color: var(--primary);
          text-decoration: none;
          font-weight: 600;
        }
        .login-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 20px 16px;
            margin: 12px;
            gap: 12px;
            border-radius: 10px;
          }
          .login-logo {
            width: 48px;
            height: 48px;
            margin-bottom: 0px;
          }
          .login-title {
            font-size: 1.05rem;
          }
          .login-subtitle {
            font-size: 0.68rem;
          }
          .login-form {
            gap: 10px;
          }
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .input-with-icon .form-control {
            height: 38px;
            font-size: 0.8rem;
          }
          .login-submit-btn {
            height: 38px;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;
