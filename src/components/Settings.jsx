import { useEffect, useState } from 'react';
import {
  getSubjects, addSubject, updateSubject, deleteSubject,
  getReferrals, addReferral, updateReferral, deleteReferral
} from '../services/db';
import ConfirmModal from './ConfirmModal';
import { handleBackdropClick } from '../utils/modalHelper';
import '../styles/theme.css';

const getCategoryBadgeClass = (category) => {
  switch (category) {
    case 'Lập trình': return 'badge-category-programming';
    case 'Văn phòng': return 'badge-category-office';
    case 'Đồ họa': return 'badge-category-graphics';
    case 'Chứng chỉ': return 'badge-category-cert';
    default: return 'badge-primary';
  }
};

const Settings = ({ role, triggerToast }) => {
  const [subjects, setSubjects] = useState([]);
  const [referrals, setReferrals] = useState([]);

  // Confirm Modal State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    type: 'subject', // subject | referral
    id: '',
    title: '',
    message: ''
  });

  // Modals for Subject
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Modals for Referral
  const [showAddReferralModal, setShowAddReferralModal] = useState(false);
  const [showEditReferralModal, setShowEditReferralModal] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);

  // Forms
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    category: 'Lập trình',
    tuition: 3000000
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [referralForm, setReferralForm] = useState({
    name: '',
    details: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      const s = await getSubjects();
      const r = await getReferrals();
      setSubjects(s);
      setReferrals(r);
    };
    fetchData();
  }, [refreshTrigger]);

  if (role !== 'Admin') {
    return <div className="card text-danger">Quyền truy cập bị từ chối! Chỉ Admin có quyền thiết lập cấu hình.</div>;
  }

  // --- ACTIONS: SUBJECTS ---
  const handleAddSubjectClick = () => {
    setSubjectForm({ name: '', category: 'Lập trình', tuition: 3000000 });
    setShowAddSubjectModal(true);
  };

  const handleEditSubjectClick = (sub) => {
    setSelectedSubject(sub);
    setSubjectForm({ name: sub.name, category: sub.category, tuition: sub.tuition });
    setShowEditSubjectModal(true);
  };

  const handleSubjectSubmit = async (e, isEdit) => {
    e.preventDefault();
    if (!subjectForm.name || !subjectForm.tuition) {
      triggerToast('Vui lòng điền đầy đủ thông tin môn học!', 'danger');
      return;
    }

    if (isEdit && selectedSubject) {
      await updateSubject(selectedSubject.id, {
        name: subjectForm.name,
        category: subjectForm.category,
        tuition: Number(subjectForm.tuition)
      });
      triggerToast('Cập nhật môn học thành công!', 'success');
      setShowEditSubjectModal(false);
    } else {
      await addSubject({
        name: subjectForm.name,
        category: subjectForm.category,
        tuition: Number(subjectForm.tuition)
      });
      triggerToast('Thêm môn học mới thành công!', 'success');
      setShowAddSubjectModal(false);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteSubject = (id) => {
    setConfirmConfig({
      type: 'subject',
      id,
      title: 'Xác nhận xóa môn học',
      message: 'Bạn có chắc chắn muốn xóa môn học/khóa học này không? Hành động này có thể ảnh hưởng đến thông tin đăng ký của các học viên liên quan.'
    });
    setConfirmOpen(true);
  };

  // --- ACTIONS: REFERRALS ---
  const handleAddReferralClick = () => {
    setReferralForm({ name: '', details: '' });
    setShowAddReferralModal(true);
  };

  const handleEditReferralClick = (ref) => {
    setSelectedReferral(ref);
    setReferralForm({ name: ref.name, details: ref.details || '' });
    setShowEditReferralModal(true);
  };

  const handleReferralSubmit = async (e, isEdit) => {
    e.preventDefault();
    if (!referralForm.name) {
      triggerToast('Vui lòng điền tên nguồn giới thiệu!', 'danger');
      return;
    }

    if (isEdit && selectedReferral) {
      await updateReferral(selectedReferral.id, {
        name: referralForm.name,
        details: referralForm.details
      });
      triggerToast('Cập nhật nguồn giới thiệu thành công!', 'success');
      setShowEditReferralModal(false);
    } else {
      await addReferral({
        name: referralForm.name,
        details: referralForm.details
      });
      triggerToast('Thêm nguồn giới thiệu mới thành công!', 'success');
      setShowAddReferralModal(false);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteReferral = (id) => {
    setConfirmConfig({
      type: 'referral',
      id,
      title: 'Xác nhận xóa nguồn giới thiệu',
      message: 'Bạn có chắc chắn muốn xóa nguồn giới thiệu này không? Điều này sẽ gỡ liên kết nguồn giới thiệu khỏi các học viên liên quan.'
    });
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmConfig.id) return;

    if (confirmConfig.type === 'subject') {
      await deleteSubject(confirmConfig.id);
      triggerToast('Đã xóa môn học thành công!', 'success');
    } else {
      await deleteReferral(confirmConfig.id);
      triggerToast('Đã xóa nguồn giới thiệu thành công!', 'success');
    }

    setConfirmOpen(false);
    setRefreshTrigger(prev => prev + 1);
  };

  const formatCurrency = (val) => {
    return val ? val.toLocaleString('vi-VN') + ' đ' : '0 đ';
  };

  return (
    <div className="settings-page-container">
      <div className="grid-2">
        
        {/* ================= SUBJECTS LIST ================= */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Danh mục Môn học</h3>
            <button className="btn btn-primary btn-sm" onClick={handleAddSubjectClick}>
              + Thêm môn học
            </button>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Mã môn</th>
                  <th>Tên môn</th>
                  <th>Phân loại</th>
                  <th>Học phí khóa</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map(sub => (
                  <tr key={sub.id}>
                    <td><strong>{sub.id}</strong></td>
                    <td>{sub.name}</td>
                    <td><span className={`badge ${getCategoryBadgeClass(sub.category)}`}>{sub.category}</span></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(sub.tuition)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" style={{ padding: '3px 6px' }} onClick={() => handleEditSubjectClick(sub)}>Sửa</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px' }} onClick={() => handleDeleteSubject(sub.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ================= REFERRALS LIST ================= */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Nguồn giới thiệu</h3>
            <button className="btn btn-primary btn-sm" onClick={handleAddReferralClick}>
              + Thêm nguồn
            </button>
          </div>

          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên nguồn</th>
                  <th>Thông tin chi tiết nguồn</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(ref => (
                  <tr key={ref.id}>
                    <td><strong>{ref.id}</strong></td>
                    <td><span className="badge badge-referral-success">{ref.name}</span></td>
                    <td>{ref.details}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                        <button className="btn btn-outline btn-sm" style={{ padding: '3px 6px' }} onClick={() => handleEditReferralClick(ref)}>Sửa</button>
                        <button className="btn btn-danger btn-sm" style={{ padding: '3px 6px' }} onClick={() => handleDeleteReferral(ref.id)}>Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ================= MODAL ADD/EDIT SUBJECT ================= */}
      {(showAddSubjectModal || showEditSubjectModal) && (
        <div className="modal-overlay" {...handleBackdropClick(() => { setShowAddSubjectModal(false); setShowEditSubjectModal(false); })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {showEditSubjectModal ? `Sửa Môn học: ${selectedSubject?.id}` : 'Thêm Môn học mới'}
              </h3>
              <button className="modal-close" onClick={() => { setShowAddSubjectModal(false); setShowEditSubjectModal(false); }}>&times;</button>
            </div>
            <form onSubmit={(e) => handleSubjectSubmit(e, showEditSubjectModal)}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên môn học / khóa học *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Lập trình Scratch Nâng Cao"
                    value={subjectForm.name}
                    onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Phân loại</label>
                    <select
                      className="form-control"
                      value={subjectForm.category}
                      onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value })}
                    >
                      <option value="Lập trình">Lập trình</option>
                      <option value="Văn phòng">Văn phòng</option>
                      <option value="Đồ họa">Đồ họa</option>
                      <option value="Chứng chỉ">Chứng chỉ</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Học phí khóa dạy (đ) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={subjectForm.tuition}
                      onChange={e => setSubjectForm({ ...subjectForm, tuition: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddSubjectModal(false); setShowEditSubjectModal(false); }}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ADD/EDIT REFERRAL ================= */}
      {(showAddReferralModal || showEditReferralModal) && (
        <div className="modal-overlay" {...handleBackdropClick(() => { setShowAddReferralModal(false); setShowEditReferralModal(false); })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {showEditReferralModal ? `Sửa Nguồn: ${selectedReferral?.id}` : 'Thêm Nguồn giới thiệu mới'}
              </h3>
              <button className="modal-close" onClick={() => { setShowAddReferralModal(false); setShowEditReferralModal(false); }}>&times;</button>
            </div>
            <form onSubmit={(e) => handleReferralSubmit(e, showEditReferralModal)}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên nguồn tuyển sinh *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Google Search, Facebook, Quảng cáo..."
                    value={referralForm.name}
                    onChange={e => setReferralForm({ ...referralForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Thông tin nguồn / Chi tiết (Ghi chú)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Nhập thông tin mô tả chi tiết cho nguồn giới thiệu..."
                    value={referralForm.details}
                    onChange={e => setReferralForm({ ...referralForm, details: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowAddReferralModal(false); setShowEditReferralModal(false); }}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu</button>
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
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        type="danger"
      />

      <style>{`
        .settings-page-container {
          font-size: 0.76rem;
        }
        .settings-page-container .card {
          border-radius: var(--radius-md) !important;
          box-shadow: var(--shadow-sm) !important;
          transition: var(--transition);
        }
        .settings-page-container .card:hover {
          transform: translateY(-1px) !important;
          box-shadow: var(--shadow-md) !important;
        }
        .settings-page-container .form-group {
          margin-bottom: 12px;
        }
        .settings-page-container .form-label {
          font-size: 0.72rem;
          margin-bottom: 4px;
          color: var(--text-secondary);
        }
        .settings-page-container .form-control {
          padding: 8px 12px;
          font-size: 0.74rem;
          border-radius: var(--radius-sm);
        }
        .settings-page-container .btn {
          padding: 8px 14px;
          font-size: 0.74rem;
          border-radius: var(--radius-sm);
        }
        .settings-page-container .btn-sm {
          padding: 4px 8px;
          font-size: 0.68rem;
        }
        .badge-category-programming {
          background-color: hsl(220, 95%, 96%);
          color: hsl(220, 85%, 45%);
          border: 1px solid hsl(220, 95%, 90%);
        }
        .badge-category-office {
          background-color: hsl(150, 80%, 96%);
          color: hsl(150, 80%, 35%);
          border: 1px solid hsl(150, 80%, 90%);
        }
        .badge-category-graphics {
          background-color: hsl(280, 85%, 96%);
          color: hsl(280, 75%, 45%);
          border: 1px solid hsl(280, 85%, 90%);
        }
        .badge-category-cert {
          background-color: hsl(35, 95%, 95%);
          color: hsl(35, 90%, 40%);
          border: 1px solid hsl(35, 95%, 88%);
        }
        .badge-referral-success {
          background-color: hsl(160, 75%, 95%);
          color: hsl(160, 80%, 32%);
          border: 1px solid hsl(160, 75%, 88%);
        }
        /* Tighten table spacing */
        .settings-page-container table th {
          padding: 8px 10px;
          font-size: 0.64rem;
        }
        .settings-page-container table td {
          padding: 8px 10px;
          font-size: 0.72rem;
        }
        /* Modal tweaks */
        .settings-page-container .modal-content {
          border-radius: var(--radius-md);
          max-width: 500px;
        }
        .settings-page-container .modal-header {
          padding: 12px 16px;
        }
        .settings-page-container .modal-title {
          font-size: 0.85rem;
          font-weight: 700;
        }
        .settings-page-container .modal-body {
          padding: 16px;
        }
        .settings-page-container .modal-footer {
          padding: 10px 16px;
        }
      `}</style>
    </div>
  );
};

export default Settings;
