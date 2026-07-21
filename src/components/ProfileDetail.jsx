import { useNavigate } from 'react-router-dom';
import '../styles/modern-bio.css';

const ProfileDetail = () => {
  const navigate = useNavigate();

  return (
    <div className="bio-container">
      <div className="gradient-bg-alt"></div>

      <div className="bio-content">
        <nav className="profile-nav glass-card">
          <button className="btn-glass-sm" onClick={() => navigate('/')}>
            &larr; Về trang chủ
          </button>
          <h2 className="gradient-text-alt" style={{ margin: 0, fontSize: '1.2rem' }}>Hồ sơ Chi tiết</h2>
        </nav>

        <div className="profile-grid">
          {/* Section: Timeline */}
          <section className="profile-section glass-card">
            <h3>⏳ Kinh nghiệm</h3>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h4>Fullstack Developer</h4>
                  <span className="timeline-date">2024 - Hiện tại</span>
                  <p>Phát triển các ứng dụng web quản lý và giáo dục bằng React & Node.js.</p>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot"></div>
                <div className="timeline-content">
                  <h4>Freelancer</h4>
                  <span className="timeline-date">2023 - 2024</span>
                  <p>Thiết kế UI/UX và lập trình Frontend cho các startup.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Skills Matrix */}
          <section className="profile-section glass-card">
            <h3>⚡ Kỹ năng chuyên môn</h3>
            <div className="skills-matrix">
              <div className="skill-item glow-hover">
                <strong>Frontend:</strong> React, Vue, HTML/CSS, Tailwind
              </div>
              <div className="skill-item glow-hover">
                <strong>Backend:</strong> Node.js, Express, Python
              </div>
              <div className="skill-item glow-hover">
                <strong>Database:</strong> MongoDB, PostgreSQL, Redis
              </div>
              <div className="skill-item glow-hover">
                <strong>Tools:</strong> Git, Docker, Figma
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
