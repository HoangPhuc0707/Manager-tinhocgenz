import React, { useEffect, useState } from 'react';
import { getStudents, getTutors, getReceipts, getPayouts, getLessons } from '../services/db';
import '../styles/theme.css';
 
const Dashboard = ({ role, activeTutorId }) => {
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [timeFilter, setTimeFilter] = useState('Tháng');
 
  // Mock "current date" context as June 2026 based on mock data dates
  const CURRENT_MONTH = 5; // June (0-indexed)
  const CURRENT_YEAR = 2026;
 
  useEffect(() => {
    const fetchData = async () => {
      const s = await getStudents();
      const t = await getTutors();
      const r = await getReceipts();
      const p = await getPayouts();
      const l = await getLessons();
 
      setStudents(s);
      setTutors(t);
      setReceipts(r);
      setPayouts(p);
      setLessons(l);
    };
    fetchData();
  }, [role, activeTutorId]);
 
  // Date Parsing Helper
  const parseMockDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('T')) return new Date(dateStr);
    const [d, m, y] = dateStr.split('/');
    return new Date(y, m - 1, d);
  };
 
  const isCurrentMonth = (date) => {
    return date && date.getMonth() === CURRENT_MONTH && date.getFullYear() === CURRENT_YEAR;
  };
 
  const isCurrentYear = (date) => {
    return date && date.getFullYear() === CURRENT_YEAR;
  };
 
  // --- ADMIN STATISTICS ---
  // Student counts
  const activeStudents = students.filter(s => s.status === 'Đang học' || s.status === 'Học thử').length;
  const graduatedStudents = students.filter(s => s.status === 'Đã tốt nghiệp').length;
  const cancelledStudents = students.filter(s => s.status === 'Tạm dừng').length;
  
  // Remaining student debt tuition
  const totalDebtTuition = students.reduce((sum, s) => sum + Number(s.debtTuition || 0), 0);
 
  // Revenues (Thu học phí)
  const revenueThisMonth = receipts.filter(r => {
    const date = parseMockDate(r.date);
    return isCurrentMonth(date);
  }).reduce((sum, r) => sum + Number(r.amount), 0);
 
  const revenueThisYear = receipts.filter(r => {
    const date = parseMockDate(r.date);
    return isCurrentYear(date);
  }).reduce((sum, r) => sum + Number(r.amount), 0);
 
  // Expenses (Thanh toán chi)
  const payoutTutorThisMonth = payouts.filter(p => {
    const date = parseMockDate(p.date);
    return p.type === 'Gia sư' && p.status === 'Đã thanh toán' && isCurrentMonth(date);
  }).reduce((sum, p) => sum + Number(p.amount), 0);
 
  const payoutTutorThisYear = payouts.filter(p => {
    const date = parseMockDate(p.date);
    return p.type === 'Gia sư' && p.status === 'Đã thanh toán' && isCurrentYear(date);
  }).reduce((sum, p) => sum + Number(p.amount), 0);
 
  const payoutSourceThisMonth = payouts.filter(p => {
    const date = parseMockDate(p.date);
    return p.type === 'Nguồn giới thiệu' && p.status === 'Đã thanh toán' && isCurrentMonth(date);
  }).reduce((sum, p) => sum + Number(p.amount), 0);
 
  const payoutSourceThisYear = payouts.filter(p => {
    const date = parseMockDate(p.date);
    return p.type === 'Nguồn giới thiệu' && p.status === 'Đã thanh toán' && isCurrentYear(date);
  }).reduce((sum, p) => sum + Number(p.amount), 0);
 
  const totalExpenseThisMonth = payoutTutorThisMonth + payoutSourceThisMonth;
  const totalDebtPayouts = payouts.filter(p => p.status === 'Chưa thanh toán').reduce((sum, p) => sum + Number(p.amount), 0);
 
  // Dynamic calculations based on timeFilter
  let adjustedRevenue = revenueThisMonth;
  let adjustedExpense = totalExpenseThisMonth;
  let adjustedProfit = revenueThisMonth - totalExpenseThisMonth;
 
  if (timeFilter === 'Tuần') {
    adjustedRevenue = Math.round(revenueThisMonth / 4);
    adjustedExpense = Math.round(totalExpenseThisMonth / 4);
    adjustedProfit = adjustedRevenue - adjustedExpense;
  } else if (timeFilter === 'Quý') {
    adjustedRevenue = revenueThisMonth * 3;
    adjustedExpense = totalExpenseThisMonth * 3;
    adjustedProfit = adjustedRevenue - adjustedExpense;
  } else if (timeFilter === 'Năm') {
    adjustedRevenue = revenueThisYear;
    adjustedExpense = payoutTutorThisYear + payoutSourceThisYear;
    adjustedProfit = adjustedRevenue - adjustedExpense;
  }
 
  // --- TUTOR STATISTICS ---
  const myStudents = students.filter(s => s.tutorId === activeTutorId);
  const myActiveStudents = myStudents.filter(s => s.status === 'Đang học' || s.status === 'Học thử').length;
  
  // Total classes/sessions completed by this tutor
  const myCompletedLessons = lessons.filter(l => l.tutorId === activeTutorId && l.status === 'Có học').length;
 
  // Tutor Payouts
  const mySalaryReceived = payouts.filter(p => {
    return p.type === 'Gia sư' && p.recipientId === activeTutorId && p.status === 'Đã thanh toán';
  }).reduce((sum, p) => sum + Number(p.amount), 0);
 
  const mySalaryPending = payouts.filter(p => {
    return p.type === 'Gia sư' && p.recipientId === activeTutorId && p.status === 'Chưa thanh toán';
  }).reduce((sum, p) => sum + Number(p.amount), 0);
 
  // Lists for Recent Activities
  const recentReceipts = [...receipts].sort((a,b) => parseMockDate(b.date) - parseMockDate(a.date)).slice(0, 5);
  const myUpcomingLessons = [...lessons]
    .filter(l => l.tutorId === activeTutorId && l.status === 'Chưa diễn ra')
    .sort((a,b) => parseMockDate(a.dateTime) - parseMockDate(b.dateTime))
    .slice(0, 5);
 
  const formatCurrency = (val) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };
 
  const getXLabels = () => {
    if (timeFilter === 'Tuần') return ['Tuần 1', 'Tuần 2', 'Tuần 3'];
    if (timeFilter === 'Quý') return ['Quý 1', 'Quý 2', 'Quý 3'];
    if (timeFilter === 'Năm') return ['Năm 2024', 'Năm 2025', 'Năm 2026'];
    return ['T4/2026', 'T5/2026', 'T6/2026'];
  };
 
  return (
    <div className="dashboard-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 className="page-title">Tổng quan hệ thống</h1>
        <div className="page-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Bộ lọc:</span>
          <select className="filter-select" style={{ minWidth: 100, padding: '6px 10px', fontSize: '0.75rem' }} value={timeFilter} onChange={e => setTimeFilter(e.target.value)}>
            <option value="Tuần">Tuần này</option>
            <option value="Tháng">Tháng này</option>
            <option value="Quý">Quý này</option>
            <option value="Năm">Năm nay</option>
          </select>
        </div>
      </div>
 
      {role === 'Admin' ? (
        // ================= ADMIN SaaS VIEW =================
        <>
          {/* KPI Cards Grid - 8 Cards */}
          <div className="stat-card-grid-saas">
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Tổng học viên</span>
                <span className="stat-card-saas-icon blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value">{students.length}</div>
              <div className="stat-card-saas-sub">Tất cả tài khoản học viên</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Học viên đang học</span>
                <span className="stat-card-saas-icon green">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value">{activeStudents}</div>
              <div className="stat-card-saas-sub">Đang học & học thử</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Học viên tốt nghiệp</span>
                <span className="stat-card-saas-icon emerald">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value">{graduatedStudents}</div>
              <div className="stat-card-saas-sub">Đã hoàn thành chương trình</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Doanh thu ({timeFilter.toLowerCase()})</span>
                <span className="stat-card-saas-icon blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value text-success" style={{ color: 'var(--success)' }}>{formatCurrency(adjustedRevenue)}</div>
              <div className="stat-card-saas-sub">Học phí thực nhận</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Doanh thu năm 2026</span>
                <span className="stat-card-saas-icon indigo">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value text-primary" style={{ color: 'var(--primary)' }}>{formatCurrency(revenueThisYear)}</div>
              <div className="stat-card-saas-sub">Doanh thu tích lũy cả năm</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Công nợ còn lại</span>
                <span className="stat-card-saas-icon orange">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value text-warning" style={{ color: 'var(--warning)' }}>{formatCurrency(totalDebtTuition)}</div>
              <div className="stat-card-saas-sub">Học viên chưa hoàn tất phí</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Chi phí chưa chi trả</span>
                <span className="stat-card-saas-icon red">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value text-danger" style={{ color: 'var(--danger)' }}>{formatCurrency(totalDebtPayouts)}</div>
              <div className="stat-card-saas-sub">Lương gia sư & hoa hồng nguồn</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Lợi nhuận ({timeFilter.toLowerCase()})</span>
                <span className="stat-card-saas-icon teal">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value" style={{ color: adjustedProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(adjustedProfit)}</div>
              <div className="stat-card-saas-sub">Doanh thu trừ thực chi</div>
            </div>
          </div>
 
          {/* Charts Section - SaaS Bigger Layout */}
          <div className="grid-2-saas" style={{ marginTop: 24 }}>
            {/* Chart 1: Bar Chart */}
            <div className="card-saas">
              <h3 className="section-title-saas">So sánh Thu & Chi ({timeFilter.toLowerCase()})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                <svg width="100%" height="240" viewBox="0 0 320 220" style={{ maxWidth: '100%' }}>
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="40" y1="70" x2="300" y2="70" stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="40" y1="120" x2="300" y2="120" stroke="#f1f5f9" strokeWidth="1.5" />
                  <line x1="40" y1="170" x2="300" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />
                  
                  {(() => {
                    const maxVal = Math.max(adjustedRevenue, adjustedExpense, 1);
                    const revHeight = (adjustedRevenue / maxVal) * 130;
                    const expHeight = (adjustedExpense / maxVal) * 130;
                    return (
                      <>
                        {/* Bar 1: Revenue (Thu) */}
                        <rect x="80" y={170 - revHeight} width="44" height={revHeight} rx="6" fill="url(#revGrad)" />
                        <text x="102" y={160 - revHeight} textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--success)">
                          +{adjustedRevenue > 0 ? (adjustedRevenue / 1000).toLocaleString('vi-VN') + 'k' : '0'}
                        </text>
 
                        {/* Bar 2: Expenses (Chi) */}
                        <rect x="190" y={170 - expHeight} width="44" height={expHeight} rx="6" fill="url(#expGrad)" />
                        <text x="212" y={160 - expHeight} textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--danger)">
                          -{adjustedExpense > 0 ? (adjustedExpense / 1000).toLocaleString('vi-VN') + 'k' : '0'}
                        </text>
                      </>
                    );
                  })()}
 
                  {/* Axis labels */}
                  <text x="102" y="192" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Thu học phí</text>
                  <text x="212" y="192" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-primary)">Thực chi</text>
                  
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                </svg>
                <div style={{ display: 'flex', gap: 24, fontSize: '0.78rem', fontWeight: 600, marginTop: 12 }}>
                  <span style={{ color: 'var(--success)' }}>● Thu: {formatCurrency(adjustedRevenue)}</span>
                  <span style={{ color: 'var(--danger)' }}>● Chi: {formatCurrency(adjustedExpense)}</span>
                </div>
              </div>
            </div>
 
            {/* Chart 2: Stacked Line Chart */}
            <div className="card-saas">
              <h3 className="section-title-saas">Xu hướng trạng thái Học viên</h3>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                {(() => {
                  const maxStudentCount = Math.max(activeStudents, graduatedStudents, cancelledStudents, 3);
                  const getY = (val) => 160 - (val / maxStudentCount) * 120;
                  const xLabels = getXLabels();
                  return (
                    <svg width="100%" height="240" viewBox="0 0 320 220" style={{ maxWidth: '100%' }}>
                      {/* Grid Lines */}
                      <line x1="40" y1={getY(0)} x2="300" y2={getY(0)} stroke="#e2e8f0" strokeWidth="1.5" />
                      <line x1="40" y1={getY(maxStudentCount * 0.33)} x2="300" y2={getY(maxStudentCount * 0.33)} stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="40" y1={getY(maxStudentCount * 0.66)} x2="300" y2={getY(maxStudentCount * 0.66)} stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="40" y1={getY(maxStudentCount)} x2="300" y2={getY(maxStudentCount)} stroke="#f1f5f9" strokeWidth="1" />
 
                      {/* Y-Axis text */}
                      <text x="25" y={getY(0) + 3} textAnchor="end" fontSize="8" fill="var(--text-secondary)" fontWeight="600">0</text>
                      <text x="25" y={getY(maxStudentCount * 0.33) + 3} textAnchor="end" fontSize="8" fill="var(--text-secondary)" fontWeight="600">{Math.round(maxStudentCount * 0.33)}</text>
                      <text x="25" y={getY(maxStudentCount * 0.66) + 3} textAnchor="end" fontSize="8" fill="var(--text-secondary)" fontWeight="600">{Math.round(maxStudentCount * 0.66)}</text>
                      <text x="25" y={getY(maxStudentCount) + 3} textAnchor="end" fontSize="8" fill="var(--text-secondary)" fontWeight="600">{maxStudentCount}</text>
 
                      {/* Line 1: Active Students */}
                      <path
                        d={`M 70 ${getY(1)} L 170 ${getY(2)} L 270 ${getY(activeStudents)}`}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="70" cy={getY(1)} r="4.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                      <circle cx="170" cy={getY(2)} r="4.5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
                      <circle cx="270" cy={getY(activeStudents)} r="4.5" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      <text x="270" y={getY(activeStudents) - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="#2563eb">{activeStudents}</text>
 
                      {/* Line 2: Graduated Students */}
                      <path
                        d={`M 70 ${getY(0)} L 170 ${getY(0)} L 270 ${getY(graduatedStudents)}`}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="70" cy={getY(0)} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                      <circle cx="170" cy={getY(0) } r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                      <circle cx="270" cy={getY(graduatedStudents)} r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                      <text x="270" y={getY(graduatedStudents) - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="#10b981">{graduatedStudents}</text>
 
                      {/* Line 3: Cancelled Students */}
                      <path
                        d={`M 70 ${getY(0)} L 170 ${getY(0)} L 270 ${getY(cancelledStudents)}`}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="70" cy={getY(0)} r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
                      <circle cx="170" cy={getY(0)} r="4.5" fill="#ffffff" stroke="#ef4444" strokeWidth="2.5" />
                      <circle cx="270" cy={getY(cancelledStudents)} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                      <text x="270" y={getY(cancelledStudents) - 8} textAnchor="middle" fontSize="9" fontWeight="800" fill="#ef4444">{cancelledStudents}</text>
 
                      {/* X Axis Labels */}
                      <text x="70" y="185" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-secondary)">{xLabels[0]}</text>
                      <text x="170" y="185" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-secondary)">{xLabels[1]}</text>
                      <text x="270" y="185" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--text-secondary)">{xLabels[2]}</text>
                    </svg>
                  );
                })()}
                
                {/* Chart Legend */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, marginTop: 6 }}>
                  <span style={{ color: '#2563eb' }}>──● Đang học ({activeStudents})</span>
                  <span style={{ color: '#10b981' }}>──● Tốt nghiệp ({graduatedStudents})</span>
                  <span style={{ color: '#ef4444' }}>──● Tạm dừng ({cancelledStudents})</span>
                </div>
              </div>
            </div>
          </div>
 
          {/* Activity Section */}
          <div className="grid-2-saas" style={{ marginTop: 24 }}>
            <div className="card-saas">
              <h3 className="section-title-saas" style={{ marginBottom: 16 }}>Lịch sử Đóng học phí gần đây</h3>
              <div className="table-responsive" style={{ border: 'none' }}>
                <table className="table-row-tall">
                  <thead>
                    <tr>
                      <th>Mã biên lai</th>
                      <th>Học viên</th>
                      <th>Số tiền</th>
                      <th>Ngày đóng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentReceipts.map(r => {
                      const student = students.find(s => s.id === r.studentId);
                      return (
                        <tr key={r.id}>
                          <td><strong>{r.id}</strong></td>
                          <td>{student ? student.name : r.studentId}</td>
                          <td className="text-success" style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</td>
                          <td>{r.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
 
            <div className="card-saas">
              <h3 className="section-title-saas" style={{ marginBottom: 16 }}>Chi phí chưa thanh toán</h3>
              <div className="table-responsive" style={{ border: 'none' }}>
                <table className="table-row-tall">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Gia sư/Nguồn</th>
                      <th>Số tiền</th>
                      <th>Phân loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.filter(p => p.status === 'Chưa thanh toán').slice(0, 5).map(p => {
                      const student = students.find(s => s.id === p.studentId);
                      let recipientName = p.recipientId;
                      if (p.type === 'Gia sư') {
                        const t = tutors.find(t => t.id === p.recipientId);
                        if (t) recipientName = t.name;
                      }
                      return (
                        <tr key={p.id}>
                          <td>{student ? student.name : p.studentId}</td>
                          <td>{recipientName}</td>
                          <td className="text-danger" style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                          <td>
                            <span className={`badge ${p.type === 'Gia sư' ? 'badge-primary' : 'badge-warning'}`}>
                              {p.type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {payouts.filter(p => p.status === 'Chưa thanh toán').length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                          Không có giao dịch chờ chi trả nào!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        // ================= TUTOR VIEW =================
        <>
          {/* Tutor Stats Cards */}
          <div className="stat-card-grid-saas" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Học viên đang dạy</span>
                <span className="stat-card-saas-icon blue">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value">{myActiveStudents}</div>
              <div className="stat-card-saas-sub">Học viên trong lớp dạy</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Buổi dạy hoàn thành</span>
                <span className="stat-card-saas-icon green">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value">{myCompletedLessons}</div>
              <div className="stat-card-saas-sub">Tổng số buổi có đi học</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Lương nhận (Tổng)</span>
                <span className="stat-card-saas-icon emerald">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value text-success" style={{ color: 'var(--success)' }}>{formatCurrency(mySalaryReceived)}</div>
              <div className="stat-card-saas-sub">Đã được trung tâm giải ngân</div>
            </div>
 
            <div className="stat-card-saas">
              <div className="stat-card-saas-header">
                <span className="stat-card-saas-label">Lương chờ thanh toán</span>
                <span className="stat-card-saas-icon orange">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </span>
              </div>
              <div className="stat-card-saas-value text-warning" style={{ color: 'var(--warning)' }}>{formatCurrency(mySalaryPending)}</div>
              <div className="stat-card-saas-sub">Thu nhập chờ tất toán</div>
            </div>
          </div>
 
          <div className="grid-2-saas" style={{ marginTop: 24 }}>
            {/* Upcoming lessons list */}
            <div className="card-saas">
              <h3 className="section-title-saas" style={{ marginBottom: 16 }}>Lịch giảng dạy sắp tới</h3>
              <div className="upcoming-list">
                {myUpcomingLessons.map(lesson => {
                  const student = students.find(s => s.id === lesson.studentId);
                  const lessonDate = new Date(lesson.dateTime);
                  return (
                    <div className="upcoming-item-saas" key={lesson.id}>
                      <div className="upcoming-date-badge-saas">
                        <span className="day">{lessonDate.getDate()}</span>
                        <span className="month">T{lessonDate.getMonth() + 1}</span>
                      </div>
                      <div className="upcoming-details-saas">
                        <span className="class-title-saas">{student ? student.name : 'Học viên'}</span>
                        <span className="class-time-saas">
                          {lesson.startTime || '??:??'} - {lesson.endTime || '??:??'} | {lesson.dateTime.split('T')[0]}
                        </span>
                        <span className="class-format-saas">
                          {student ? student.learningFormat : 'Offline'} • <span style={{ color: 'var(--text-muted)' }}>{lesson.address}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {myUpcomingLessons.length === 0 && (
                  <div className="empty-state" style={{ border: 'none', padding: 20 }}>
                    <p className="no-data">Không có lịch học sắp tới nào.</p>
                  </div>
                )}
              </div>
            </div>
 
            {/* My Student list shortcut */}
            <div className="card-saas">
              <h3 className="section-title-saas" style={{ marginBottom: 16 }}>Học viên của tôi ({myStudents.length})</h3>
              <div className="table-responsive" style={{ border: 'none' }}>
                <table className="table-row-tall">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Môn học</th>
                      <th>Số buổi dạy</th>
                      <th>Tiến độ học</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myStudents.map(student => (
                      <tr key={student.id}>
                        <td><strong>{student.name}</strong></td>
                        <td>{student.subjectId}</td>
                        <td style={{ fontWeight: 600 }}>{student.completedSessions}/{student.expectedSessions}</td>
                        <td>
                          <div className="progress-bar-container" style={{ maxWidth: 100 }}>
                            <div
                              className="progress-bar-fill"
                              style={{ width: `${Math.min(100, (student.completedSessions / student.expectedSessions) * 100)}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {myStudents.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>
                          Chưa được gán học viên nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
 
      <style>{`
        .dashboard-container {
          display: flex;
          flex-direction: column;
        }
 
        /* SaaS grid structure */
        .stat-card-grid-saas {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 1200px) {
          .stat-card-grid-saas {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 576px) {
          .stat-card-grid-saas {
            grid-template-columns: 1fr;
          }
        }
 
        /* SaaS modern KPI cards styling */
        .stat-card-saas {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-md);
          padding: 16px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-card);
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stat-card-saas:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: rgba(37, 99, 235, 0.15);
        }
        .stat-card-saas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stat-card-saas-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .stat-card-saas-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-card-saas-icon.blue { background-color: var(--primary-light); color: var(--primary); }
        .stat-card-saas-icon.green { background-color: var(--success-light); color: var(--success); }
        .stat-card-saas-icon.emerald { background-color: #ecfdf5; color: #10b981; }
        .stat-card-saas-icon.indigo { background-color: #e0e7ff; color: #4f46e5; }
        .stat-card-saas-icon.orange { background-color: #fff7ed; color: #ea580c; }
        .stat-card-saas-icon.red { background-color: var(--danger-light); color: var(--danger); }
        .stat-card-saas-icon.teal { background-color: #f0fdfa; color: #0d9488; }
 
        .stat-card-saas-value {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .stat-card-saas-sub {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 500;
        }
 
        /* SaaS charts container */
        .grid-2-saas {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 992px) {
          .grid-2-saas {
            grid-template-columns: 1fr;
          }
        }
 
        .card-saas {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 20px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-card);
        }
        .section-title-saas {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 0;
          margin-bottom: 20px;
          letter-spacing: -0.2px;
        }
 
        /* Upcoming List */
        .upcoming-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
 
        .upcoming-item-saas {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 8px;
          background-color: #f8fafc;
          border: 1px solid var(--border-color);
          transition: var(--transition);
        }
 
        .upcoming-item-saas:hover {
          border-color: rgba(37, 99, 235, 0.2);
          transform: translateX(2px);
          box-shadow: var(--shadow-sm);
        }
 
        .upcoming-date-badge-saas {
          width: 44px;
          height: 44px;
          border-radius: 6px;
          background-color: var(--primary);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.1;
        }
 
        .upcoming-date-badge-saas .day {
          font-size: 1.1rem;
          font-weight: 800;
        }
 
        .upcoming-date-badge-saas .month {
          font-size: 0.6rem;
          font-weight: 600;
          text-transform: uppercase;
        }
 
        .upcoming-details-saas {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
 
        .class-title-saas {
          font-size: 0.825rem;
          font-weight: 700;
          color: var(--text-primary);
        }
 
        .class-time-saas {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }
 
        .class-format-saas {
          font-size: 0.72rem;
          color: var(--text-secondary);
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
 
        .no-data {
          text-align: center;
          padding: 20px;
          color: var(--text-secondary);
          font-size: 0.8rem;
        }
 
        /* Progress Bar */
        .progress-bar-container {
          width: 100%;
          height: 6px;
          background-color: var(--border-color);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
 
        .progress-bar-fill {
          height: 100%;
          background-color: var(--success);
          border-radius: var(--radius-full);
        }
      `}</style>
    </div>
  );
};
 
export default Dashboard;
