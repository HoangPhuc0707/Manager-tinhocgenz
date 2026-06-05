import { useEffect, useState } from 'react';
import { initDB } from './services/db';
import logoVertical from './assets/logo_vertical.png';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Tutors from './components/Tutors';
import Students from './components/Students';
import Payments from './components/Payments';
import Settings from './components/Settings';
import Login from './components/Login';
import './styles/theme.css';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const role = user ? user.role : 'Admin';
  const activeTutorId = user ? user.linkId : '';

  // Initialize LocalStorage DB on startup
  useEffect(() => {
    const startDB = async () => {
      await initDB();
      setDbInitialized(true);
    };
    startDB();
  }, []);

  // Redirect tutor to dashboard if they are on an admin-only tab
  useEffect(() => {
    if (role === 'Gia sư' && ['tutors', 'settings'].includes(activeTab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    localStorage.setItem('user_session', JSON.stringify(loggedInUser));
    setActiveTab('dashboard');
    triggerToast('Đăng nhập thành công!', 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user_session');
    triggerToast('Đã đăng xuất tài khoản!', 'success');
  };

  // Close sidebar on mobile when tab changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSidebarOpen(false);
  }, [activeTab]);

  // Toast System
  const triggerToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (!dbInitialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f7fe', fontFamily: 'system-ui' }}>
        <style>{`
          @keyframes logo-pulse {
            0%, 100% { transform: scale(0.97); opacity: 0.85; filter: drop-shadow(0 0 8px rgba(37, 99, 235, 0.15)); }
            50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 0 20px rgba(37, 99, 235, 0.35)); }
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <img 
            src={logoVertical} 
            alt="Tin Học GenZ Logo" 
            style={{ 
              width: '160px', 
              height: '160px', 
              objectFit: 'contain', 
              marginBottom: 12,
              animation: 'logo-pulse 2.5s ease-in-out infinite' 
            }} 
          />
          <p style={{ color: '#64748b', fontWeight: 600 }}>Đang tải cơ sở dữ liệu học tập...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />
        {/* Global Toast Notifications Container */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              <div className="toast-message">{t.message}</div>
              <button className="toast-close" onClick={() => removeToast(t.id)}>&times;</button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Render current tab component
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard role={role} activeTutorId={activeTutorId} triggerToast={triggerToast} />;
      case 'calendar':
        return <CalendarView role={role} activeTutorId={activeTutorId} triggerToast={triggerToast} />;
      case 'tutors':
        return <Tutors role={role} triggerToast={triggerToast} />;
      case 'students':
        return <Students role={role} activeTutorId={activeTutorId} triggerToast={triggerToast} />;
      case 'payments':
        return <Payments role={role} triggerToast={triggerToast} />;
      case 'settings':
        return <Settings role={role} triggerToast={triggerToast} />;
      default:
        return <Dashboard role={role} activeTutorId={activeTutorId} />;
    }
  };

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        role={role} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Wrapper */}
      <div className="main-wrapper">
        <Navbar
          activeTab={activeTab}
          user={user}
          onLogout={handleLogout}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="content-container">
          {renderTabContent()}
        </main>
      </div>

      {/* Global Toast Notifications Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div className="toast-message">{t.message}</div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>&times;</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
