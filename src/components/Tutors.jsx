import { useEffect, useState } from 'react';
import { getTutors, addTutor, updateTutor, deleteTutor, getSubjects, getStudents, getPayouts } from '../services/db';
import ConfirmModal from './ConfirmModal';
import { handleBackdropClick } from '../utils/modalHelper';
import '../styles/theme.css';
 
const Tutors = ({ role, triggerToast }) => {
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
 
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  
  // Confirm Delete Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tutorToDelete, setTutorToDelete] = useState(null);
 
  // Form State
  const [form, setForm] = useState({
    name: '',
    dob: '',
    phone: '',
    email: '',
    address: '',
    status: 'Chưa có lớp',
    subjects: [], // array of subject ids
    isPayable: true
  });
 
  useEffect(() => {
    const fetchData = async () => {
      const list = await getTutors();
      const subs = await getSubjects();
      const studs = await getStudents();
      const pays = await getPayouts();
 
      setTutors(list);
      setSubjects(subs);
      setStudents(studs);
      setPayouts(pays);
    };
    fetchData();
  }, [refreshTrigger]);
 
  if (role !== 'Admin') {
    return <div className="card text-danger">Quyền truy cập bị từ chối! Trang này chỉ dành cho Admin.</div>;
  }
 
  // Calculate age from Date of Birth
  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
 
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };
 
  const handleFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };
 
  // Checkbox select for subjects
  const handleSubjectCheckboxChange = (subjectId) => {
    const currentSubjects = [...form.subjects];
    const index = currentSubjects.indexOf(subjectId);
    if (index === -1) {
      currentSubjects.push(subjectId);
    } else {
      currentSubjects.splice(index, 1);
    }
    setForm({ ...form, subjects: currentSubjects });
  };
 
  // Add click
  const handleAddClick = () => {
    setForm({
      name: '',
      dob: '',
      phone: '',
      email: '',
      address: '',
      status: 'Chưa có lớp',
      subjects: [],
      isPayable: true
    });
    setShowAddModal(true);
  };
 
  // Edit click
  const handleEditClick = (tutor) => {
    setSelectedTutor(tutor);
    setForm({
      name: tutor.name,
      dob: tutor.dob || '',
      phone: tutor.phone,
      email: tutor.email,
      address: tutor.address,
      status: tutor.status,
      subjects: tutor.subjects || [],
      isPayable: tutor.isPayable !== undefined ? tutor.isPayable : true
    });
    setShowEditModal(true);
  };
 
  // Add submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      triggerToast('Vui lòng nhập đầy đủ các trường bắt buộc!', 'danger');
      return;
    }
    
    // Autocalculate age for storing
    const age = calculateAge(form.dob);
 
    await addTutor({
      ...form,
      age
    });
    triggerToast('Thêm hồ sơ Gia sư mới thành công!', 'success');
    setShowAddModal(false);
    setRefreshTrigger(prev => prev + 1);
  };
 
  // Edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTutor) return;
 
    const age = calculateAge(form.dob);
 
    await updateTutor(selectedTutor.id, {
      ...form,
      age
    });
    triggerToast('Cập nhật hồ sơ Gia sư thành công!', 'success');
    setShowEditModal(false);
    setRefreshTrigger(prev => prev + 1);
  };
 
  // Delete click
  const handleDeleteClick = (id) => {
    setTutorToDelete(id);
    setConfirmOpen(true);
  };
 
  const handleConfirmDelete = async () => {
    if (tutorToDelete) {
      await deleteTutor(tutorToDelete);
      triggerToast('Đã xóa hồ sơ Gia sư thành công!', 'success');
      setTutorToDelete(null);
      setConfirmOpen(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };
 
  // Filters logic
  const filteredTutors = tutors.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.phone.includes(searchTerm) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = statusFilter ? t.status === statusFilter : true;
 
    return matchSearch && matchStatus;
  });
 
  const formatCurrency = (val) => {
    return val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ';
  };
 
  const getAvatarColor = (name) => {
    const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#0d9488'];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };
 
  // Compute Top stats
  const totalTutorsCount = tutors.length;
  const activeTutorsCount = tutors.filter(t => t.status === 'Đang dạy').length;
  const unassignedTutorsCount = tutors.filter(t => t.status === 'Chưa có lớp').length;
  const pendingPaymentTutorsCount = tutors.filter(t => 
    payouts.some(p => p.recipientId === t.id && p.status === 'Chưa thanh toán' && p.type === 'Gia sư')
  ).length;
 
  return (
    <div className="tutors-container">
      <div className="page-header">
        <h1 className="page-title">Hồ sơ Gia sư (Giáo viên)</h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleAddClick}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm Gia sư mới
          </button>
        </div>
      </div>
 
      {/* 4 Stats Summary Row at Top */}
      <div className="stat-card-grid-saas" style={{ marginBottom: 20 }}>
        <div className="stat-card-saas">
          <div className="stat-card-saas-header">
            <span className="stat-card-saas-label">Tổng gia sư</span>
            <span className="stat-card-saas-icon blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </span>
          </div>
          <div className="stat-card-saas-value">{totalTutorsCount}</div>
          <div className="stat-card-saas-sub">Hồ sơ giáo viên trong hệ thống</div>
        </div>
 
        <div className="stat-card-saas">
          <div className="stat-card-saas-header">
            <span className="stat-card-saas-label">Đang giảng dạy</span>
            <span className="stat-card-saas-icon green">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </span>
          </div>
          <div className="stat-card-saas-value">{activeTutorsCount}</div>
          <div className="stat-card-saas-sub">Gia sư đang có lớp dạy active</div>
        </div>
 
        <div className="stat-card-saas">
          <div className="stat-card-saas-header">
            <span className="stat-card-saas-label">Chưa có lớp</span>
            <span className="stat-card-saas-icon orange">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </span>
          </div>
          <div className="stat-card-saas-value">{unassignedTutorsCount}</div>
          <div className="stat-card-saas-sub">Gia sư sẵn sàng nhận lớp mới</div>
        </div>
 
        <div className="stat-card-saas">
          <div className="stat-card-saas-header">
            <span className="stat-card-saas-label">Chờ thanh toán</span>
            <span className="stat-card-saas-icon red">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </span>
          </div>
          <div className="stat-card-saas-value text-danger" style={{ color: 'var(--danger)' }}>{pendingPaymentTutorsCount}</div>
          <div className="stat-card-saas-sub">Gia sư có lương chưa giải ngân</div>
        </div>
      </div>
 
      {/* Filter bar */}
      <div className="search-filter-bar card" style={{ padding: 16 }}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm theo tên, số điện thoại, email..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="select-wrapper">
          <select className="filter-select" value={statusFilter} onChange={handleFilterChange}>
            <option value="">Tất cả trạng thái</option>
            <option value="Đang dạy">Đang dạy</option>
            <option value="Chưa có lớp">Chưa có lớp</option>
            <option value="Đã nghỉ">Đã nghỉ</option>
          </select>
        </div>
      </div>
 
      {/* Tutors Profile Cards Grid */}
      <div className="tutor-cards-grid" style={{ marginTop: 20 }}>
        {filteredTutors.map(t => {
          const tutorStudents = students.filter(s => s.tutorId === t.id && (s.status === 'Đang học' || s.status === 'Học thử'));
          const tutorIncome = payouts
            .filter(p => p.type === 'Gia sư' && p.recipientId === t.id && p.status === 'Đã thanh toán')
            .reduce((sum, p) => sum + Number(p.amount), 0);
          
          let statusBadge = 'badge-primary';
          if (t.status === 'Đang dạy') statusBadge = 'badge-success';
          if (t.status === 'Chưa có lớp') statusBadge = 'badge-warning';
          if (t.status === 'Đã nghỉ') statusBadge = 'badge-danger';
 
          const avatarLetter = t.name ? t.name.charAt(0).toUpperCase() : 'G';
          const avatarBg = getAvatarColor(t.name || '');

          return (
            <div className="tutor-profile-card" key={t.id}>
              {/* Header profile details */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div className="tutor-avatar" style={{ backgroundColor: avatarBg }}>{avatarLetter}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{t.id}</div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</h3>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.phone}</div>
                </div>
                <span className={`badge ${statusBadge}`} style={{ alignSelf: 'flex-start' }}>{t.status}</span>
              </div>
 
              {/* Info stats */}
              <div className="tutor-info-divider"></div>
 
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Email:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all', textAlign: 'right' }}>{t.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Tuổi:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.age || calculateAge(t.dob) || '??'} tuổi</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Phân loại:</span>
                  {t.isPayable !== false ? (
                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>GV ngoài (Trả lương)</span>
                  ) : (
                    <span style={{ fontWeight: 700, color: 'var(--success)' }}>GV trung tâm</span>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Số lớp phụ trách:</span>
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{tutorStudents.length} lớp học</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Thu nhập tích lũy:</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(tutorIncome)}</span>
                </div>
              </div>
 
              {/* Subjects taught tags */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Môn học chuyên môn</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {t.subjects && t.subjects.map(subId => {
                    const sub = subjects.find(s => s.id === subId);
                    return (
                      <span key={subId} className="tutor-subject-tag">
                        {sub ? sub.name : subId}
                      </span>
                    );
                  })}
                  {(!t.subjects || t.subjects.length === 0) && (
                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.72rem' }}>Chưa thiết lập</span>
                  )}
                </div>
              </div>
 
              {/* Card actions */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => handleEditClick(t)}>Sửa</button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleDeleteClick(t.id)}>Xóa</button>
              </div>
            </div>
          );
        })}
        {filteredTutors.length === 0 && (
          <div className="empty-state" style={{ gridColumn: 'span 4' }}>
            <p>Không tìm thấy hồ sơ Gia sư nào phù hợp!</p>
          </div>
        )}
      </div>
 
      {/* ================= MODAL ADD TUTOR ================= */}
      {showAddModal && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowAddModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm Gia sư mới</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.dob}
                      onChange={e => setForm({ ...form, dob: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Ví dụ: 0987654321"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Email liên hệ *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="tutor@gmail.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái dạy</label>
                    <select
                      className="form-control"
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Chưa có lớp">Chưa có lớp</option>
                      <option value="Đang dạy">Đang dạy</option>
                      <option value="Đã nghỉ">Đã nghỉ</option>
                    </select>
                  </div>
                </div>
 
                <div className="form-group">
                  <label className="form-label">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Số nhà, đường, phường/xã..."
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
 
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: 10 }}>Môn học có thể giảng dạy (Chuyên môn)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', maxHeight: '140px', overflowY: 'auto', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {subjects.map(sub => (
                      <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.subjects.includes(sub.id)}
                          onChange={() => handleSubjectCheckboxChange(sub.id)}
                        />
                        {sub.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Phân loại Giáo viên (Hình thức chi trả)</label>
                  <select
                    className="form-control"
                    value={form.isPayable ? "external" : "center"}
                    onChange={e => setForm({ ...form, isPayable: e.target.value === "external" })}
                  >
                    <option value="external">Giáo viên ngoài (Chi trả lương)</option>
                    <option value="center">Giáo viên trung tâm (Không chi trả - Tính vào doanh thu)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Gia sư</button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* ================= MODAL EDIT TUTOR ================= */}
      {showEditModal && selectedTutor && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowEditModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cập nhật hồ sơ Gia sư: {selectedTutor.id}</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Ngày sinh</label>
                    <input
                      type="date"
                      className="form-control"
                      value={form.dob}
                      onChange={e => setForm({ ...form, dob: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Email liên hệ *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái dạy</label>
                    <select
                      className="form-control"
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Chưa có lớp">Chưa có lớp</option>
                      <option value="Đang dạy">Đang dạy</option>
                      <option value="Đã nghỉ">Đã nghỉ</option>
                    </select>
                  </div>
                </div>
 
                <div className="form-group">
                  <label className="form-label">Địa chỉ thường trú</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
 
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: 10 }}>Môn học có thể giảng dạy (Chuyên môn)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', maxHeight: '140px', overflowY: 'auto', padding: '6px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    {subjects.map(sub => (
                      <label key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.subjects.includes(sub.id)}
                          onChange={() => handleSubjectCheckboxChange(sub.id)}
                        />
                        {sub.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Phân loại Giáo viên (Hình thức chi trả)</label>
                  <select
                    className="form-control"
                    value={form.isPayable ? "external" : "center"}
                    onChange={e => setForm({ ...form, isPayable: e.target.value === "external" })}
                  >
                    <option value="external">Giáo viên ngoài (Chi trả lương)</option>
                    <option value="center">Giáo viên trung tâm (Không chi trả - Tính vào doanh thu)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* ================= CONFIRM DELETE MODAL ================= */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa hồ sơ Gia sư"
        message="Hệ thống sẽ xóa vĩnh viễn dữ liệu của gia sư này và gỡ các phân công dạy lớp hiện tại. Bạn có chắc chắn muốn thực hiện hành động này?"
        confirmText="Xóa Gia sư"
        cancelText="Hủy"
        type="danger"
      />
 
      <style>{`
        .tutor-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        @media (max-width: 1200px) {
          .tutor-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 576px) {
          .tutor-cards-grid {
            grid-template-columns: 1fr;
          }
        }
 
        .tutor-profile-card {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 16px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-card);
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
 
        .tutor-profile-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: rgba(37, 99, 235, 0.12);
        }
 
        .tutor-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.95rem;
          flex-shrink: 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
 
        .tutor-info-divider {
          border-bottom: 1px solid var(--border-color);
        }
 
        .tutor-subject-tag {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 600;
          padding: 2px 6px;
          background-color: var(--bg-primary);
          color: var(--text-secondary);
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }
      `}</style>
    </div>
  );
};
 
export default Tutors;
