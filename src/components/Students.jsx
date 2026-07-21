import { useEffect, useState } from 'react';
import { getStudents, addStudent, updateStudent, deleteStudent, getTutors, getSubjects, getReferrals, getReceipts } from '../services/db';
import ConfirmModal from './ConfirmModal';
import { handleBackdropClick } from '../utils/modalHelper';
import '../styles/theme.css';

const Students = ({ role, activeTutorId, triggerToast }) => {
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [tutorFilter, setTutorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals / Drawer
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeStudentDrawer, setActiveStudentDrawer] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Confirm Delete Modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    registerDate: '',
    subjectId: '',
    expectedSessions: 24,
    learningFormat: 'Offline',
    address: '',
    tutorId: '',
    referralId: '',
    totalTuition: 3000000,
    status: 'Đang học',
    notes: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const list = await getStudents();
      const tList = await getTutors();
      const sList = await getSubjects();
      const rList = await getReferrals();
      const recs = await getReceipts();

      setStudents(list);
      setTutors(tList);
      setSubjects(sList);
      setReferrals(rList);
      setReceipts(recs);
    };
    fetchData();
  }, [role, activeTutorId, refreshTrigger]);

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const handleSubjectFilterChange = (e) => setSubjectFilter(e.target.value);
  const handleTutorFilterChange = (e) => setTutorFilter(e.target.value);
  const handleStatusFilterChange = (e) => setStatusFilter(e.target.value);

  // Add click
  const handleAddClick = () => {
    const today = new Date().toISOString().split('T')[0];
    setForm({
      name: '',
      phone: '',
      age: '',
      registerDate: today.split('-').reverse().join('/'), // DD/MM/YYYY
      subjectId: subjects[0]?.id || '',
      expectedSessions: 24,
      learningFormat: 'Offline',
      address: '',
      tutorId: tutors[0]?.id || '',
      referralId: referrals[0]?.id || '',
      totalTuition: subjects[0]?.tuition || 3000000,
      status: 'Đang học',
      notes: ''
    });
    setShowAddModal(true);
  };

  // Edit click
  const handleEditClick = (student) => {
    setSelectedStudent(student);
    setForm({
      name: student.name,
      phone: student.phone,
      age: student.age || '',
      registerDate: student.registerDate || '',
      subjectId: student.subjectId,
      expectedSessions: student.expectedSessions,
      learningFormat: student.learningFormat,
      address: student.address,
      tutorId: student.tutorId,
      referralId: student.referralId,
      totalTuition: student.totalTuition,
      status: student.status,
      notes: student.notes || ''
    });
    setShowEditModal(true);
  };

  // Subject change inside Form (auto-populate expected tuition)
  const handleFormSubjectChange = (e) => {
    const subId = e.target.value;
    const selectedSub = subjects.find(s => s.id === subId);
    setForm({
      ...form,
      subjectId: subId,
      totalTuition: selectedSub ? selectedSub.tuition : form.totalTuition
    });
  };

  // Add submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.subjectId) {
      triggerToast('Vui lòng nhập đầy đủ các thông tin bắt buộc!', 'danger');
      return;
    }

    try {
      await addStudent({
        ...form,
        age: Number(form.age),
        expectedSessions: Number(form.expectedSessions),
        totalTuition: Number(form.totalTuition)
      });
      triggerToast('Đã thêm học viên mới và tạo tài khoản liên quan!', 'success');
      setShowAddModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  // Edit submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      await updateStudent(selectedStudent.id, {
        ...form,
        age: Number(form.age),
        expectedSessions: Number(form.expectedSessions),
        totalTuition: Number(form.totalTuition)
      });
      triggerToast('Cập nhật hồ sơ học viên thành công!', 'success');
      setShowEditModal(false);

      // Update drawer state if active
      if (activeStudentDrawer && activeStudentDrawer.id === selectedStudent.id) {
        const updated = {
          ...activeStudentDrawer,
          ...form,
          age: Number(form.age),
          expectedSessions: Number(form.expectedSessions),
          totalTuition: Number(form.totalTuition)
        };
        setActiveStudentDrawer(updated);
      }

      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  // Delete click
  const handleDeleteClick = (id) => {
    setStudentToDelete(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (studentToDelete) {
      await deleteStudent(studentToDelete);
      triggerToast('Đã xóa học viên thành công!', 'success');
      if (activeStudentDrawer && activeStudentDrawer.id === studentToDelete) {
        setActiveStudentDrawer(null);
      }
      setStudentToDelete(null);
      setConfirmOpen(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Filter students based on role and filters
  const visibleStudents = role === 'Gia sư'
    ? students.filter(s => s.tutorId === activeTutorId)
    : students;

  const filteredStudents = visibleStudents.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm);

    const matchSubject = subjectFilter ? s.subjectId === subjectFilter : true;
    const matchTutor = tutorFilter ? s.tutorId === tutorFilter : true;
    const matchStatus = statusFilter ? s.status === statusFilter : true;

    return matchSearch && matchSubject && matchTutor && matchStatus;
  });

  const formatCurrency = (val) => {
    return val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ';
  };



  return (
    <div className="students-container">
      <div className="page-header">
        <h1 className="page-title">
          {role === 'Admin' ? 'Quản lý Học viên' : 'Danh sách Học viên của tôi'}
        </h1>
        {role === 'Admin' && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={handleAddClick}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Thêm học viên mới
            </button>
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="search-filter-bar card" style={{ padding: 16 }}>
        <div className="search-input-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="Tìm kiếm học viên theo tên, SĐT..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className="select-wrapper">
          <select className="filter-select" value={subjectFilter} onChange={handleSubjectFilterChange}>
            <option value="">Tất cả môn học</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.id} - {sub.name}</option>
            ))}
          </select>
        </div>
        {role === 'Admin' && (
          <div className="select-wrapper">
            <select className="filter-select" value={tutorFilter} onChange={handleTutorFilterChange}>
              <option value="">Tất cả gia sư</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="select-wrapper">
          <select className="filter-select" value={statusFilter} onChange={handleStatusFilterChange}>
            <option value="">Tất cả trạng thái</option>
            <option value="Đang học">Đang học</option>
            <option value="Tạm dừng">Tạm nghỉ</option>
            <option value="Huỷ khoá">Huỷ khoá</option>
            <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
          </select>
        </div>
      </div>

      {/* CRM-Style Data Table */}
      <div className="card" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'auto' }}>
          <table className="table-sticky-header table-row-tall">
            <thead>
              <tr>
                <th>Mã HV<br />Tên HV</th>
                <th>SĐT</th>
                <th>Tuổi</th>
                <th>Môn học<br />Hình thức</th>
                <th>Gia sư<br />Nguồn</th>
                {role === 'Admin' && (
                  <>
                    <th>Tổng HP</th>
                    <th>Còn lại</th>
                  </>
                )}
                <th style={{ textAlign: 'center' }}>Số buổi</th>
                <th>Trạng thái</th>
                {role === 'Admin' && <th style={{ textAlign: 'center' }}>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(s => {
                const sub = subjects.find(sub => sub.id === s.subjectId);
                const tutor = tutors.find(t => t.id === s.tutorId);
                const ref = referrals.find(r => r.id === s.referralId);

                let statusBadge = 'badge-primary';
                let statusText = s.status;
                let customBadgeStyle = {};
                if (s.status === 'Đang học') {
                  statusBadge = 'badge-success';
                  statusText = 'Đang học';
                } else if (s.status === 'Tạm dừng') {
                  statusBadge = '';
                  statusText = '🛑 Tạm nghỉ';
                  customBadgeStyle = {
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fca5a5',
                    fontWeight: 700
                  };
                } else if (s.status === 'Huỷ khoá') {
                  statusBadge = '';
                  statusText = '❌ Huỷ khoá';
                  customBadgeStyle = {
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #f87171',
                    fontWeight: 700
                  };
                } else if (s.status === 'Đã tốt nghiệp') {
                  statusBadge = '';
                  statusText = '🎓 Tốt nghiệp';
                  customBadgeStyle = {
                    backgroundColor: '#f3e8ff',
                    color: '#6b21a8',
                    border: '1px solid #e9d5ff',
                    fontWeight: 700
                  };
                }

                return (
                  <tr key={s.id} className={`crm-table-row ${s.status === 'Tạm dừng' ? 'row-muted' : ''}`} onClick={() => setActiveStudentDrawer(s)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>{s.id}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.name}</div>
                      </div>
                    </td>
                    <td>{s.phone}</td>
                    <td>{s.age}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{sub ? sub.name : s.subjectId}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.learningFormat}</div>
                    </td>
                    <td>
                      <div>{tutor ? tutor.name : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa giao</span>}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{ref ? ref.name : 'Chưa rõ'}</div>
                    </td>
                    {role === 'Admin' && (
                      <>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(s.totalTuition)}</td>
                        <td style={{ fontWeight: 700, color: s.status === 'Huỷ khoá' ? 'var(--text-muted)' : (s.debtTuition > 0 ? 'var(--danger)' : 'var(--success)') }}>
                          {s.status === 'Huỷ khoá' ? '—' : formatCurrency(s.debtTuition)}
                        </td>
                      </>
                    )}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{s.completedSessions}/{s.expectedSessions}</div>
                      <div className="progress-bar-container" style={{ width: '50px', margin: '4px auto 0' }}>
                        <div className="progress-bar-fill" style={{ width: `${Math.min(100, (s.completedSessions / s.expectedSessions) * 100)}%` }}></div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge}`} style={customBadgeStyle}>{statusText}</span>
                    </td>
                    {role === 'Admin' && (
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button className="btn btn-outline btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); handleEditClick(s); }}>
                            Sửa
                          </button>
                          <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => { e.stopPropagation(); handleDeleteClick(s.id); }}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={role === 'Admin' ? 10 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    Không tìm thấy học viên nào phù hợp!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL ADD STUDENT ================= */}
      {showAddModal && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowAddModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm học viên mới</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Trần Thị B"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="0987654321"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tuổi</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="15"
                      value={form.age}
                      onChange={e => setForm({ ...form, age: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Môn học đăng ký *</label>
                    <select
                      className="form-control"
                      value={form.subjectId}
                      onChange={handleFormSubjectChange}
                      required
                    >
                      <option value="">-- Chọn môn học --</option>
                      {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.id} - {sub.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tổng học phí trọn gói (đ)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.totalTuition}
                      onChange={e => setForm({ ...form, totalTuition: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Số buổi dự kiến</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.expectedSessions}
                      onChange={e => setForm({ ...form, expectedSessions: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày đăng ký học</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="DD/MM/YYYY"
                      value={form.registerDate}
                      onChange={e => setForm({ ...form, registerDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Hình thức học</label>
                    <select
                      className="form-control"
                      value={form.learningFormat}
                      onChange={e => setForm({ ...form, learningFormat: e.target.value })}
                    >
                      <option value="Offline">Offline (Trực tiếp tại nhà)</option>
                      <option value="Online">Online (Trực tuyến)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái học viên</label>
                    <select
                      className="form-control"
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Đang học">Đang học</option>
                      <option value="Tạm dừng">Tạm nghỉ</option>
                      <option value="Huỷ khoá">Huỷ khoá</option>
                      <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ nhà học sinh / Link học Online</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nếu Online nhập Link Meet/Zoom, nếu Offline nhập số nhà..."
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Gia sư phụ trách</label>
                    <select
                      className="form-control"
                      value={form.tutorId}
                      onChange={e => setForm({ ...form, tutorId: e.target.value })}
                    >
                      <option value="">-- Chọn gia sư --</option>
                      {tutors.map(t => (
                        <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nguồn giới thiệu</label>
                    <select
                      className="form-control"
                      value={form.referralId}
                      onChange={e => setForm({ ...form, referralId: e.target.value })}
                    >
                      <option value="">-- Chọn nguồn --</option>
                      {referrals.map(r => (
                        <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú thông tin học viên</label>
                  <textarea
                    className="form-control"
                    placeholder="Nhập ghi chú hoặc thông tin bổ sung về học viên..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu học viên</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT STUDENT ================= */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowEditModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Cập nhật hồ sơ Học viên: {selectedStudent.id}</h3>
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
                    <label className="form-label">Số điện thoại *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tuổi</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.age}
                      onChange={e => setForm({ ...form, age: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Môn học đăng ký *</label>
                    <select
                      className="form-control"
                      value={form.subjectId}
                      onChange={handleFormSubjectChange}
                      required
                    >
                      {subjects.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.id} - {sub.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tổng học phí trọn gói (đ)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.totalTuition}
                      onChange={e => setForm({ ...form, totalTuition: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Số buổi dự kiến</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.expectedSessions}
                      onChange={e => setForm({ ...form, expectedSessions: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày đăng ký học</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.registerDate}
                      onChange={e => setForm({ ...form, registerDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Hình thức học</label>
                    <select
                      className="form-control"
                      value={form.learningFormat}
                      onChange={e => setForm({ ...form, learningFormat: e.target.value })}
                    >
                      <option value="Offline">Offline (Trực tiếp tại nhà)</option>
                      <option value="Online">Online (Trực tuyến)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái học viên</label>
                    <select
                      className="form-control"
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Đang học">Đang học</option>
                      <option value="Tạm dừng">Tạm nghỉ</option>
                      <option value="Huỷ khoá">Huỷ khoá</option>
                      <option value="Đã tốt nghiệp">Đã tốt nghiệp</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ nhà học sinh / Link học Online</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Gia sư phụ trách</label>
                    <select
                      className="form-control"
                      value={form.tutorId}
                      onChange={e => setForm({ ...form, tutorId: e.target.value })}
                    >
                      <option value="">-- Chưa giao --</option>
                      {tutors.map(t => (
                        <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nguồn giới thiệu</label>
                    <select
                      className="form-control"
                      value={form.referralId}
                      onChange={e => setForm({ ...form, referralId: e.target.value })}
                    >
                      <option value="">-- Chưa giao --</option>
                      {referrals.map(r => (
                        <option key={r.id} value={r.id}>{r.id} - {r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú thông tin học viên</label>
                  <textarea
                    className="form-control"
                    placeholder="Nhập ghi chú hoặc thông tin bổ sung về học viên..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    rows={3}
                  />
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

      {/* ================= DRAWERS: STUDENT DETAILS ================= */}
      {activeStudentDrawer && (
        <div className="drawer-overlay" {...handleBackdropClick(() => setActiveStudentDrawer(null))}>
          <div className="drawer-content" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3 className="modal-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>{activeStudentDrawer.name}</h3>
              </div>
              <button className="modal-close" onClick={() => setActiveStudentDrawer(null)}>&times;</button>
            </div>

            <div className="drawer-body">
              {/* Profile Overview */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mã số: {activeStudentDrawer.id} | Ngày đăng ký: {activeStudentDrawer.registerDate}</div>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '16px 0' }} />

              {/* Personal Info Grid */}
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Thông tin liên hệ & Lớp học</h4>
              <div className="detail-grid" style={{ rowGap: 14 }}>
                <div className="detail-item">
                  <span className="detail-label">Số điện thoại</span>
                  <span className="detail-value">{activeStudentDrawer.phone}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tuổi học viên</span>
                  <span className="detail-value">{activeStudentDrawer.age} tuổi</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Môn học đăng ký</span>
                  <span className="detail-value">
                    {subjects.find(s => s.id === activeStudentDrawer.subjectId)?.name || activeStudentDrawer.subjectId}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Hình thức học</span>
                  <span className="detail-value">{activeStudentDrawer.learningFormat}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-label">Địa chỉ / Link Meet</span>
                  <span className="detail-value" style={{ wordBreak: 'break-all' }}>{activeStudentDrawer.address || 'Không có thông tin'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Gia sư phụ trách</span>
                  <span className="detail-value">
                    {tutors.find(t => t.id === activeStudentDrawer.tutorId)?.name || 'Chưa phân công'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Nguồn giới thiệu</span>
                  <span className="detail-value">
                    {referrals.find(r => r.id === activeStudentDrawer.referralId)?.name || 'Trực tiếp'}
                  </span>
                </div>
                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-label">Ghi chú thông tin</span>
                  <span className="detail-value" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontWeight: 'normal' }}>
                    {activeStudentDrawer.notes || 'Không có ghi chú'}
                  </span>
                </div>
              </div>

              <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '20px 0' }} />

              {/* Learning Progress */}
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Tiến độ học tập</h4>
              <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600 }}>Số buổi giảng dạy:</span>
                  <span style={{ fontWeight: 700 }}>{activeStudentDrawer.completedSessions} / {activeStudentDrawer.expectedSessions} buổi</span>
                </div>
                <div className="progress-bar-container" style={{ height: 8, marginBottom: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(100, (activeStudentDrawer.completedSessions / activeStudentDrawer.expectedSessions) * 100)}%` }}></div>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Đã học: {activeStudentDrawer.completedSessions} buổi</span>
                  <span>Còn lại: {activeStudentDrawer.remainingSessions} buổi</span>
                </div>
              </div>



              {role === 'Admin' && (
                <>
                  <hr style={{ border: 'none', borderBottom: '1px solid var(--border-color)', margin: '20px 0' }} />

                  {/* Financial Status Summary */}
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Trạng thái tài chính học phí</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="detail-grid" style={{ rowGap: 8 }}>
                      <div className="detail-item">
                        <span className="detail-label">Tổng học phí</span>
                        <span className="detail-value">{formatCurrency(activeStudentDrawer.totalTuition)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Đã nộp học phí</span>
                        <span className="detail-value text-success" style={{ color: 'var(--success)' }}>{formatCurrency(activeStudentDrawer.paidTuition)}</span>
                      </div>
                      <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                        <span className="detail-label">Nợ học phí còn lại</span>
                        <span className="detail-value text-danger" style={{ color: activeStudentDrawer.status === 'Huỷ khoá' ? 'var(--text-muted)' : (activeStudentDrawer.debtTuition > 0 ? 'var(--danger)' : 'var(--success)') }}>
                          {activeStudentDrawer.status === 'Huỷ khoá' ? '— Khoá đã huỷ, không cần hoàn thành' : formatCurrency(activeStudentDrawer.debtTuition)}
                        </span>
                      </div>
                    </div>

                    {/* Financial Progress Bar */}
                    <div className="progress-bar-container" style={{ height: 6 }}>
                      <div className="progress-bar-fill" style={{ backgroundColor: 'var(--primary)', width: `${Math.min(100, (activeStudentDrawer.paidTuition / activeStudentDrawer.totalTuition) * 100)}%` }}></div>
                    </div>

                    {/* Receipts Log Timeline inside Drawer */}
                    <div style={{ marginTop: 10 }}>
                      <span className="detail-label" style={{ marginBottom: 6, display: 'block' }}>Lịch sử giao dịch đóng phí</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {receipts.filter(r => r.studentId === activeStudentDrawer.id).map(r => (
                          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: '#f8fafc', borderRadius: 6, fontSize: '0.74rem', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {r.id}
                                {r.proofImg && (
                                  <span
                                    title="Xem ảnh minh chứng"
                                    style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', display: 'inline-flex' }}
                                    onClick={() => setPreviewImage(r.proofImg)}
                                  >
                                    🖼️
                                  </span>
                                )}
                              </span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', display: 'block' }}>{r.date} • {r.method}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>+{formatCurrency(Number(r.amount))}</span>
                          </div>
                        ))}
                        {receipts.filter(r => r.studentId === activeStudentDrawer.id).length === 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có biên lai nào được lập.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="drawer-footer">
              <button className="btn btn-outline" onClick={() => setActiveStudentDrawer(null)}>Đóng</button>
              {role === 'Admin' && (
                <>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      const student = activeStudentDrawer;
                      const today = new Date().toISOString().split('T')[0];
                      setForm({
                        name: student.name,
                        phone: student.phone,
                        age: student.age || '',
                        registerDate: today.split('-').reverse().join('/'),
                        subjectId: subjects[0]?.id || '',
                        expectedSessions: 24,
                        learningFormat: student.learningFormat || 'Offline',
                        address: student.address || '',
                        tutorId: '',
                        referralId: student.referralId || '',
                        totalTuition: subjects[0]?.tuition || 3000000,
                        status: 'Đang học',
                        notes: `Đăng ký khóa mới (Học viên cũ: ${student.name} - ${student.id}).`
                      });
                      setActiveStudentDrawer(null);
                      setShowAddModal(true);
                    }}
                  >
                    Đăng ký khóa mới
                  </button>
                  <button className="btn btn-primary" onClick={() => { handleEditClick(activeStudentDrawer); }}>Sửa hồ sơ</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= CONFIRM DELETE MODAL ================= */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa Học viên"
        message="Bạn có chắc chắn muốn xóa hồ sơ Học viên này? Hệ thống sẽ xóa vĩnh viễn dữ liệu điểm danh và hóa đơn đóng phí liên quan!"
        confirmText="Xóa Học viên"
        cancelText="Hủy"
        type="danger"
      />

      <style>{`
        .crm-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.85rem;
          flex-shrink: 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .crm-table-row {
          transition: var(--transition);
        }
        .crm-table-row:hover {
          background-color: #f1f5f9 !important;
        }
        .row-muted td {
          color: var(--text-muted) !important;
        }
        .row-muted {
          opacity: 0.7;
        }
      `}</style>

      {previewImage && (
        <div className="modal-overlay" {...handleBackdropClick(() => setPreviewImage(null))} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Ảnh minh chứng giao dịch</span>
              <button className="modal-close" style={{ position: 'static', padding: 0 }} onClick={() => setPreviewImage(null)}>&times;</button>
            </div>
            <img src={previewImage} alt="Ảnh minh chứng" style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 'var(--radius-md)', marginTop: '8px' }} />
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '8px', width: '100%' }} onClick={() => setPreviewImage(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
