import React, { useEffect, useState } from 'react';
import { getTutors } from '../services/db';
import '../styles/theme.css';

const Navbar = ({ activeTab, user, onLogout, toggleSidebar }) => {
  const [tutors, setTutors] = useState([]);

  useEffect(() => {
    const fetchTutors = async () => {
      const list = await getTutors();
      setTutors(list);
    };
    fetchTutors();
  }, []);

  const role = user ? user.role : 'Admin';
  const activeTutorId = user ? user.linkId : '';
  const activeTutor = tutors.find(t => t.id === activeTutorId);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="breadcrumb">
          <span className="breadcrumb-parent">Tin Học GenZ</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-active">
            {activeTab === 'dashboard' && 'Tổng quan'}
            {activeTab === 'calendar' && 'Lịch biểu'}
            {activeTab === 'tutors' && 'Gia sư'}
            {activeTab === 'students' && 'Học viên'}
            {activeTab === 'payments' && 'Thu & Chi'}
            {activeTab === 'settings' && 'Thiết lập'}
          </span>
        </div>
        <div className="navbar-greeting">
          Xin chào, <span className="greeting-name">{role === 'Admin' ? 'Quản trị viên' : activeTutor ? activeTutor.name : 'Gia sư'}</span>
          <span className="greeting-separator">•</span>
          <span className="greeting-date">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="navbar-right">
        <button 
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
          onClick={onLogout}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Đăng xuất
        </button>
      </div>

      <style>{`
        .navbar {
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .navbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .sidebar-toggle {
          display: none;
          background: transparent;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }

        .sidebar-toggle:hover {
          background-color: var(--bg-primary);
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
        }

        .breadcrumb-parent {
          color: var(--text-secondary);
        }

        .breadcrumb-separator {
          color: var(--text-muted);
          font-size: 0.7rem;
        }

        .breadcrumb-active {
          color: var(--primary);
          font-weight: 600;
        }

        .navbar-greeting {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .greeting-name {
          color: var(--text-primary);
          font-weight: 700;
        }

        .greeting-separator {
          color: var(--border-color);
        }

        .greeting-date {
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .mock-auth-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background-color: var(--bg-primary);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .select-wrapper {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .select-label {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .auth-select {
          border: 1px solid var(--border-color);
          background-color: var(--bg-secondary);
          color: var(--text-primary);
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          transition: var(--transition);
        }

        .auth-select:focus {
          border-color: var(--primary);
        }

        .auth-select.tutor {
          max-width: 110px;
        }

        @media (max-width: 992px) {
          .navbar {
            padding: 12px 16px;
          }
          .sidebar-toggle {
            display: flex;
          }
          .navbar-left {
            flex-direction: row;
            gap: 12px;
          }
          .navbar-greeting {
            display: none;
          }
        }

        @media (max-width: 576px) {
          .mock-auth-card {
            padding: 2px 6px;
            gap: 6px;
          }
          .select-label {
            font-size: 0.6rem;
          }
          .auth-select {
            padding: 2px 4px;
            font-size: 0.7rem;
          }
          .auth-select.tutor {
            max-width: 80px;
          }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
