import '../styles/theme.css';

const Sidebar = ({ activeTab, setActiveTab, role, isOpen, setIsOpen }) => {
  const menuItems = role === 'Admin' ? [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: 'Lịch biểu',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    },
    {
      id: 'tutors',
      label: 'Gia sư (GV)',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      id: 'students',
      label: 'Học viên',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      id: 'payments',
      label: 'Thu & Chi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Thiết lập',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    }
  ] : [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    },
    {
      id: 'calendar',
      label: 'Lịch biểu dạy',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    },
    {
      id: 'students',
      label: 'Học viên của tôi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      )
    },
    {
      id: 'payments',
      label: 'Thu & Chi',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    }
  ];

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="sidebar-close-btn" onClick={() => setIsOpen(false)} aria-label="Close Sidebar">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', padding: '16px 12px' }}>
        <img 
          src="/src/assets/logo_horizontal.png" 
          alt="Tin Học GenZ Logo" 
          style={{ width: '100%', maxHeight: '42px', objectFit: 'contain', display: 'block' }} 
        />
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">
            {role[0].toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">{role === 'Admin' ? 'Quản trị viên' : 'Gia sư'}</span>
            <span className="user-role">{role} Account</span>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          background: linear-gradient(195deg, #090e1a 0%, #0d214f 40%, #1e40af 80%, #0a1020 100%);
          height: 100vh;
          position: fixed;
          top: 0;
          left: 0;
          display: flex;
          flex-direction: column;
          z-index: 100;
          border-right: 1px solid rgba(56, 189, 248, 0.15);
          box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .sidebar-close-btn {
          display: none;
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }

        .sidebar-close-btn:hover {
          color: #ffffff;
          background-color: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
 
        .sidebar-logo {
          padding: 20px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-bottom: 1px solid rgba(56, 189, 248, 0.12);
          position: relative;
        }
 
        .sidebar-logo img {
          animation: logo-pulse-glow 4s infinite ease-in-out;
        }
 
        @keyframes logo-pulse-glow {
          0% { filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.15)); }
          50% { filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.6)); }
          100% { filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.15)); }
        }
 
        .sidebar-nav {
          padding: 20px 0 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
          overflow-y: auto;
        }
 
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 16px;
          border-radius: 8px 0 0 8px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          text-align: left;
          font-weight: 500;
          font-size: 0.82rem;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          width: 100%;
          border-left: 3px solid transparent;
          position: relative;
        }
 
        .nav-item:hover {
          background-color: rgba(56, 189, 248, 0.08);
          color: #ffffff;
          transform: translateX(6px);
          border-left-color: rgba(56, 189, 248, 0.4);
        }
 
        .nav-item.active {
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.18) 0%, rgba(56, 189, 248, 0.02) 100%);
          color: #ffffff;
          font-weight: 700;
          border-left-color: #06b6d4;
          box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), 0 4px 15px rgba(6, 182, 212, 0.15);
          text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
        }
 
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.9;
          color: inherit;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
 
        .nav-item:hover .nav-icon {
          transform: scale(1.15) rotate(3deg);
          color: #06b6d4;
        }

        .nav-item.active .nav-icon {
          color: #06b6d4;
          filter: drop-shadow(0 0 5px rgba(6, 182, 212, 0.6));
        }
 
        .sidebar-footer {
          padding: 16px 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
 
        .user-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(8px);
          padding: 10px;
          border-radius: 12px;
          border: 1px solid rgba(56, 189, 248, 0.12);
          transition: all 0.25s ease;
        }
 
        .user-badge:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 0 4px 15px rgba(56, 189, 248, 0.15);
        }
 
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #06b6d4 0%, #2563eb 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: transform 0.25s ease;
        }

        .user-badge:hover .user-avatar {
          transform: scale(1.08);
        }
 
        .user-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
 
        .user-name {
          font-size: 0.78rem;
          font-weight: 600;
          color: #f8fafc;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
 
        .user-role {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.45);
        }

        /* Mobile Responsive Sidebar */
        @media (max-width: 992px) {
          .sidebar {
            transform: translateX(-100%);
            box-shadow: none;
            width: 260px;
          }
          
          .sidebar.open {
            transform: translateX(0);
            box-shadow: 8px 0 30px rgba(0, 0, 0, 0.5);
          }

          .sidebar-close-btn {
            display: flex;
          }

          .sidebar-nav {
            padding-right: 12px;
          }
          
          .nav-item {
            border-radius: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default Sidebar;
