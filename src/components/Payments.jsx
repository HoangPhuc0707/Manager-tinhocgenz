import { useEffect, useState } from 'react';
import {
  getStudents, getReceipts, addReceipt, deleteReceipt,
  getPayouts, addPayout, updatePayout, deletePayout,
  getTutors, getReferrals
} from '../services/db';
import ConfirmModal from './ConfirmModal';
import { handleBackdropClick } from '../utils/modalHelper';
import '../styles/theme.css';
 
const Payments = ({ role, triggerToast }) => {
  const [students, setStudents] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [previewImage, setPreviewImage] = useState(null);

  const handleFileChange = (e, formSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      formSetter(prev => ({ ...prev, proofImg: reader.result }));
    };
    reader.readAsDataURL(file);
  };
 
  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
 
  // Modals state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutModalConfig, setPayoutModalConfig] = useState({
    studentId: '',
    type: 'Gia sư', // 'Gia sư' | 'Nguồn giới thiệu'
    recipientId: '',
    recipientName: '',
    amount: '',
    status: 'Chưa thanh toán',
    date: '',
    method: 'Chuyển khoản',
    note: ''
  });
 
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newReceiptForm, setNewReceiptForm] = useState({
    amount: '',
    date: '',
    method: 'Chuyển khoản',
    note: 'Đóng học phí',
    proofImg: ''
  });
 
  // Confirm Modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    type: 'receipt', // 'receipt' | 'payout'
    id: '',
    title: '',
    message: ''
  });

  // View Toggle Mode & Sub Tabs
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [activeSubTab, setActiveSubTab] = useState('receipts'); // 'receipts' | 'payouts'
  const [payoutTypeFilter, setPayoutTypeFilter] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('');
  const [cardTuitionFilter, setCardTuitionFilter] = useState('');
  const [cardTutorFilter, setCardTutorFilter] = useState('');
  const [cardRefFilter, setCardRefFilter] = useState('');

  // Flat Modals & Forms
  const [showAddReceiptFlatModal, setShowAddReceiptFlatModal] = useState(false);
  const [flatReceiptForm, setFlatReceiptForm] = useState({
    studentId: '',
    amount: '',
    date: '',
    method: 'Chuyển khoản',
    note: 'Đóng học phí',
    proofImg: ''
  });

  const [showProcessPayFlatModal, setShowProcessPayFlatModal] = useState(false);
  const [flatPayoutToProcess, setFlatPayoutToProcess] = useState(null);
  const [flatProcessForm, setFlatProcessForm] = useState({
    date: '',
    method: 'Chuyển khoản'
  });
 
  useEffect(() => {
    const fetchData = async () => {
      const s = await getStudents();
      const r = await getReceipts();
      const p = await getPayouts();
      const t = await getTutors();
      const ref = await getReferrals();

      setStudents(s);
      setReceipts(r);
      setPayouts(p);
      setTutors(t);
      setReferrals(ref);
    };
    fetchData();
  }, [refreshTrigger]);
 
  if (role !== 'Admin' && role !== 'Gia sư') {
    return <div className="card text-danger">Quyền truy cập bị từ chối! Mục quản lý Thu & Chi chỉ dành cho Admin hoặc Gia sư.</div>;
  }
 
  // Formatting currency helper
  const formatCurrency = (val) => {
    return typeof val === 'number' ? val.toLocaleString('vi-VN') + ' đ' : '0 đ';
  };
 
  // --- ACTIONS: PAYOUT MODAL ---
  const handleOpenPayoutModal = (student, type) => {
    const studentId = student.id;
    const recipientId = type === 'Gia sư' ? student.tutorId : student.referralId;
 
    if (!recipientId) {
      triggerToast(
        type === 'Gia sư'
          ? 'Học viên này chưa được gán Gia sư phụ trách!'
          : 'Học viên này không có Nguồn giới thiệu!',
        'warning'
      );
      return;
    }
 
    const t = type === 'Gia sư' ? tutors.find(t => t.id === recipientId) : null;
    const r = type !== 'Gia sư' ? referrals.find(r => r.id === recipientId) : null;
 
    if (type === 'Gia sư' && t && !t.isPayable) {
      triggerToast('Giáo viên này được cấu hình không chi trả lương!', 'warning');
      return;
    }
 
    if (type === 'Nguồn giới thiệu' && r && !r.isPayable) {
      triggerToast('Nguồn giới thiệu này được cấu hình không chi trả hoa hồng!', 'warning');
      return;
    }
    const recipientName = type === 'Gia sư'
      ? (t ? `${t.id} - ${t.name}` : recipientId)
      : (r ? `${r.id} - ${r.name}` : recipientId);
 
    // Find if payout already exists
    const existingPayout = payouts.find(
      p => p.studentId === studentId && p.type === type && p.recipientId === recipientId
    );
 
    const today = new Date().toISOString().split('T')[0];
 
    if (existingPayout) {
      setPayoutModalConfig({
        id: existingPayout.id,
        studentId,
        studentName: student.name,
        type,
        recipientId,
        recipientName,
        amount: existingPayout.amount,
        status: existingPayout.status,
        date: existingPayout.date || today.split('-').reverse().join('/'),
        method: existingPayout.method || 'Chuyển khoản',
        note: existingPayout.note || ''
      });
    } else {
      setPayoutModalConfig({
        id: null,
        studentId,
        studentName: student.name,
        type,
        recipientId,
        recipientName,
        amount: '',
        status: 'Chưa thanh toán',
        date: today.split('-').reverse().join('/'),
        method: 'Chuyển khoản',
        note: type === 'Gia sư' ? 'Thanh toán lương giáo viên' : 'Hoa hồng nguồn giới thiệu'
      });
    }
 
    setShowPayoutModal(true);
  };
 
  const handlePayoutSubmit = async (e) => {
    e.preventDefault();
    const { id, studentId, type, recipientId, amount, status, date, method, note } = payoutModalConfig;
 
    if (!amount || Number(amount) <= 0) {
      triggerToast('Vui lòng nhập số tiền chi phí hợp lệ!', 'danger');
      return;
    }
 
    if (type === 'Gia sư') {
      const student = students.find(s => s.id === studentId);
      const t = student ? tutors.find(tut => tut.id === student.tutorId) : null;
      if (t && !t.isPayable) {
        triggerToast('Không thể tạo phiếu chi cho Giáo viên không chi trả lương!', 'danger');
        return;
      }
    }
 
    if (type === 'Nguồn giới thiệu') {
      const student = students.find(s => s.id === studentId);
      const r = student ? referrals.find(ref => ref.id === student.referralId) : null;
      if (r && !r.isPayable) {
        triggerToast('Không thể tạo phiếu chi cho Nguồn giới thiệu không chi trả hoa hồng!', 'danger');
        return;
      }
    }
 
    try {
      if (id) {
        // Update existing payout
        await updatePayout(id, {
          amount: Number(amount),
          status,
          date: status === 'Đã thanh toán' ? date : '',
          method: status === 'Đã thanh toán' ? method : '',
          note
        });
        triggerToast('Cập nhật phiếu chi thành công!', 'success');
      } else {
        // Create new payout
        await addPayout({
          studentId,
          type,
          recipientId,
          amount: Number(amount),
          status,
          date: status === 'Đã thanh toán' ? date : '',
          method: status === 'Đã thanh toán' ? method : '',
          note
        });
        triggerToast('Tạo phiếu chi mới thành công!', 'success');
      }
 
      setShowPayoutModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };
 
  // --- ACTIONS: RECEIPTS MODAL (HỌC PHÍ) ---
  const handleOpenReceiptsModal = (student) => {
    setSelectedStudent(student);
    const today = new Date().toISOString().split('T')[0];
    setNewReceiptForm({
      amount: '',
      date: today.split('-').reverse().join('/'),
      method: 'Chuyển khoản',
      note: 'Đóng học phí',
      proofImg: ''
    });
    setShowReceiptsModal(true);
  };
 
  const handleAddReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!newReceiptForm.amount || Number(newReceiptForm.amount) <= 0) {
      triggerToast('Vui lòng nhập số tiền thu học phí hợp lệ!', 'danger');
      return;
    }
 
    try {
      await addReceipt({
        studentId: selectedStudent.id,
        amount: Number(newReceiptForm.amount),
        date: newReceiptForm.date,
        method: newReceiptForm.method,
        note: newReceiptForm.note,
        proofImg: newReceiptForm.proofImg
      });
      triggerToast('Nạp tiền đóng học phí thành công!', 'success');
      
      // Update local view for selectedStudent
      const updatedStudents = await getStudents();
      const updatedS = updatedStudents.find(s => s.id === selectedStudent.id);
      setSelectedStudent(updatedS);
 
      setNewReceiptForm(prev => ({ ...prev, amount: '', proofImg: '' }));
      const fileInput = document.getElementById('receipt-proof-input');
      if (fileInput) fileInput.value = '';
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };
 
  const handleDeleteReceiptClick = (receiptId) => {
    setConfirmConfig({
      type: 'receipt',
      id: receiptId,
      title: 'Hủy biên lai đóng tiền',
      message: 'Hành động này sẽ xóa biên lai nộp tiền và hoàn trừ lại số nợ học phí của học sinh. Bạn có chắc chắn muốn xóa?'
    });
    setConfirmOpen(true);
  };
 
  const handleConfirmDelete = async () => {
    if (confirmConfig.type === 'receipt' && confirmConfig.id) {
      try {
        await deleteReceipt(confirmConfig.id);
        triggerToast('Đã xóa biên lai đóng tiền thành công!', 'success');
        
        // Update selectedStudent modal info
        if (selectedStudent) {
          const updatedStudents = await getStudents();
          const updatedS = updatedStudents.find(s => s.id === selectedStudent.id);
          setSelectedStudent(updatedS);
        }

        setConfirmOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        triggerToast(err.message, 'danger');
      }
    } else if (confirmConfig.type === 'payout' && confirmConfig.id) {
      try {
        await deletePayout(confirmConfig.id);
        triggerToast('Đã xóa phiếu chi thành công!', 'success');
        setConfirmOpen(false);
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        triggerToast(err.message, 'danger');
      }
    }
  };

  const handleDeletePayoutClick = (payoutId) => {
    setConfirmConfig({
      type: 'payout',
      id: payoutId,
      title: 'Hủy phiếu chi phí',
      message: 'Hành động này sẽ xóa phiếu chi và hoàn lại hạn mức ngân sách của học sinh. Bạn có chắc chắn muốn xóa?'
    });
    setConfirmOpen(true);
  };

  // --- ACTIONS: FLAT LIST VIEW ---
  const handleOpenAddReceiptFlatModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFlatReceiptForm({
      studentId: students[0]?.id || '',
      amount: '',
      date: today.split('-').reverse().join('/'),
      method: 'Chuyển khoản',
      note: 'Đóng học phí',
      proofImg: ''
    });
    setShowAddReceiptFlatModal(true);
  };

  const handleFlatReceiptSubmit = async (e) => {
    e.preventDefault();
    if (!flatReceiptForm.studentId || !flatReceiptForm.amount || Number(flatReceiptForm.amount) <= 0) {
      triggerToast('Vui lòng chọn học viên và nhập số tiền thu học phí hợp lệ!', 'danger');
      return;
    }

    try {
      await addReceipt({
        studentId: flatReceiptForm.studentId,
        amount: Number(flatReceiptForm.amount),
        date: flatReceiptForm.date,
        method: flatReceiptForm.method,
        note: flatReceiptForm.note,
        proofImg: flatReceiptForm.proofImg
      });
      triggerToast('Ghi nhận đóng học phí thành công!', 'success');
      setShowAddReceiptFlatModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  const handleOpenAddPayoutFlatModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultStudent = students[0];
    const defaultTutorId = defaultStudent ? defaultStudent.tutorId : '';
    const defaultTutor = tutors.find(t => t.id === defaultTutorId);
    const defaultTutorName = defaultTutor ? `${defaultTutor.id} - ${defaultTutor.name}` : defaultTutorId || '';

    setPayoutModalConfig({
      id: null,
      studentId: defaultStudent ? defaultStudent.id : '',
      studentName: defaultStudent ? defaultStudent.name : '',
      type: 'Gia sư',
      recipientId: defaultTutorId || '',
      recipientName: defaultTutorName,
      amount: '',
      status: 'Chưa thanh toán',
      date: today.split('-').reverse().join('/'),
      method: 'Chuyển khoản',
      note: 'Thanh toán lương giáo viên'
    });
    setShowPayoutModal(true);
  };

  const handleOpenEditPayoutFromList = (payout) => {
    const student = students.find(s => s.id === payout.studentId);
    const t = payout.type === 'Gia sư' ? tutors.find(t => t.id === payout.recipientId) : null;
    const r = payout.type !== 'Gia sư' ? referrals.find(r => r.id === payout.recipientId) : null;
    const recipientName = payout.type === 'Gia sư'
      ? (t ? `${t.id} - ${t.name}` : payout.recipientId)
      : (r ? `${r.id} - ${r.name}` : payout.recipientId);

    const today = new Date().toISOString().split('T')[0];

    setPayoutModalConfig({
      id: payout.id,
      studentId: payout.studentId,
      studentName: student ? student.name : payout.studentId,
      type: payout.type,
      recipientId: payout.recipientId,
      recipientName,
      amount: payout.amount,
      status: payout.status,
      date: payout.date || today.split('-').reverse().join('/'),
      method: payout.method || 'Chuyển khoản',
      note: payout.note || ''
    });
    setShowPayoutModal(true);
  };

  const handlePayoutFormStudentChange = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    
    const type = payoutModalConfig.type;
    const recipientId = type === 'Gia sư' ? student.tutorId : student.referralId;
    
    let recipientName = '';
    if (type === 'Gia sư') {
      const t = tutors.find(t => t.id === recipientId);
      recipientName = t ? `${t.id} - ${t.name}` : recipientId || '';
    } else {
      const r = referrals.find(r => r.id === recipientId);
      recipientName = r ? `${r.id} - ${r.name}` : recipientId || '';
    }

    setPayoutModalConfig(prev => ({
      ...prev,
      studentId,
      studentName: student.name,
      recipientId: recipientId || '',
      recipientName: recipientName || ''
    }));
  };

  const handlePayoutFormTypeChange = (type) => {
    const student = students.find(s => s.id === payoutModalConfig.studentId);
    if (!student) {
      setPayoutModalConfig(prev => ({ ...prev, type }));
      return;
    }
    
    const recipientId = type === 'Gia sư' ? student.tutorId : student.referralId;
    
    let recipientName = '';
    if (type === 'Gia sư') {
      const t = tutors.find(t => t.id === recipientId);
      recipientName = t ? `${t.id} - ${t.name}` : recipientId || '';
    } else {
      const r = referrals.find(r => r.id === recipientId);
      recipientName = r ? `${r.id} - ${r.name}` : recipientId || '';
    }

    setPayoutModalConfig(prev => ({
      ...prev,
      type,
      recipientId: recipientId || '',
      recipientName: recipientName || ''
    }));
  };

  const handleOpenProcessPayFlatModal = (payout) => {
    const today = new Date().toISOString().split('T')[0];
    setFlatPayoutToProcess(payout);
    setFlatProcessForm({
      date: today.split('-').reverse().join('/'),
      method: 'Chuyển khoản'
    });
    setShowProcessPayFlatModal(true);
  };

  const handleFlatProcessPaySubmit = async (e) => {
    e.preventDefault();
    if (!flatPayoutToProcess) return;

    try {
      await updatePayout(flatPayoutToProcess.id, {
        status: 'Đã thanh toán',
        date: flatProcessForm.date,
        method: flatProcessForm.method
      });
      triggerToast('Duyệt chi thanh toán thành công!', 'success');
      setShowProcessPayFlatModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };
 
  // Real-time search logic
  const searchedStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter students by financial card status
  const filteredCardStudents = searchedStudents.filter(s => {
    const tutorPayout = payouts.find(p => p.studentId === s.id && p.type === 'Gia sư');
    const refPayout = payouts.find(p => p.studentId === s.id && p.type === 'Nguồn giới thiệu');
    const ref = referrals.find(r => r.id === s.referralId);
    const tutor = tutors.find(t => t.id === s.tutorId);
    
    const isTuitionPaid = s.debtTuition === 0;
    const isTutorPaid = (!tutor || !tutor.isPayable) ? true : (tutorPayout ? tutorPayout.status === 'Đã thanh toán' : false);
    const isRefPaid = (!ref || !ref.isPayable) ? true : (refPayout ? refPayout.status === 'Đã thanh toán' : false);
    
    // 1. Tuition filter
    if (cardTuitionFilter === 'paid' && !isTuitionPaid) return false;
    if (cardTuitionFilter === 'debt' && s.debtTuition === 0) return false;

    // 2. Tutor payout filter
    if (cardTutorFilter === 'paid' && !isTutorPaid) return false;
    if (cardTutorFilter === 'unpaid' && isTutorPaid) return false;

    // 3. Referral payout filter
    if (cardRefFilter === 'paid' && !isRefPaid) return false;
    if (cardRefFilter === 'unpaid' && isRefPaid) return false;

    return true;
  });

  // Flat List filter logic
  const filteredReceipts = receipts.filter(r => {
    const student = students.find(s => s.id === r.studentId);
    return student
      ? student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.id.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
  });

  const filteredPayouts = payouts.filter(p => {
    const student = students.find(s => s.id === p.studentId);
    const matchSearch = student
      ? student.name.toLowerCase().includes(searchTerm.toLowerCase()) || student.id.toLowerCase().includes(searchTerm.toLowerCase())
      : false;
    const matchType = payoutTypeFilter ? p.type === payoutTypeFilter : true;
    const matchStatus = payoutStatusFilter ? p.status === payoutStatusFilter : true;
    return matchSearch && matchType && matchStatus;
  });
 
  // Priority sorting: accounts needing action (debt > 0 or pending payout) are pushed to the top
  const sortedStudents = [...filteredCardStudents].sort((a, b) => {
    const aTutorPayout = payouts.find(p => p.studentId === a.id && p.type === 'Gia sư');
    const aRefPayout = payouts.find(p => p.studentId === a.id && p.type === 'Nguồn giới thiệu');
    const bTutorPayout = payouts.find(p => p.studentId === b.id && p.type === 'Gia sư');
    const bRefPayout = payouts.find(p => p.studentId === b.id && p.type === 'Nguồn giới thiệu');
 
    const aRef = referrals.find(r => r.id === a.referralId);
    const aRefNeedsPayout = aRef && aRef.isPayable && (!aRefPayout || aRefPayout.status === 'Chưa thanh toán');
 
    const bRef = referrals.find(r => r.id === b.referralId);
    const bRefNeedsPayout = bRef && bRef.isPayable && (!bRefPayout || bRefPayout.status === 'Chưa thanh toán');
 
    const aTutor = tutors.find(t => t.id === a.tutorId);
    const aTutorNeedsPayout = aTutor && aTutor.isPayable && (!aTutorPayout || aTutorPayout.status === 'Chưa thanh toán');
 
    const bTutor = tutors.find(t => t.id === b.tutorId);
    const bTutorNeedsPayout = bTutor && bTutor.isPayable && (!bTutorPayout || bTutorPayout.status === 'Chưa thanh toán');
 
    const aNeedsAction = a.debtTuition > 0 || 
      aTutorNeedsPayout || 
      aRefNeedsPayout;
    
    const bNeedsAction = b.debtTuition > 0 || 
      bTutorNeedsPayout || 
      bRefNeedsPayout;
 
    if (aNeedsAction && !bNeedsAction) return -1;
    if (!aNeedsAction && bNeedsAction) return 1;
    return b.debtTuition - a.debtTuition; // Default fallback to highest debt first
  });
 
  // Calculate financial status badges
  const getFinancialStatus = (s) => {
    const tutorPayout = payouts.find(p => p.studentId === s.id && p.type === 'Gia sư');
    const refPayout = payouts.find(p => p.studentId === s.id && p.type === 'Nguồn giới thiệu');
    const ref = referrals.find(r => r.id === s.referralId);
    const tutor = tutors.find(t => t.id === s.tutorId);
    
    if (s.status === 'Huỷ khoá') {
      return { label: 'Huỷ khoá', badgeClass: 'badge-danger' };
    }

    const isTuitionPaid = s.debtTuition === 0;
    const isTutorPaid = (!tutor || !tutor.isPayable) ? true : (tutorPayout ? tutorPayout.status === 'Đã thanh toán' : false);
    const isRefPaid = (!ref || !ref.isPayable) ? true : (refPayout ? refPayout.status === 'Đã thanh toán' : false);
    
    if (isTuitionPaid && isTutorPaid && isRefPaid) {
      return { label: 'Đã hoàn thành', badgeClass: 'badge-success' };
    }
    if (isTuitionPaid) {
      return { label: 'Đã thanh toán', badgeClass: 'badge-success' };
    }
    
    const tutorPending = tutor && tutor.isPayable && (!tutorPayout || tutorPayout.status === 'Chưa thanh toán');
    const refPending = ref && ref.isPayable && (!refPayout || refPayout.status === 'Chưa thanh toán');
    
    if (tutorPending || refPending) {
      return { label: 'Chờ đề xuất', badgeClass: 'badge-warning' };
    }
    
    // Parse mock registration date to detect overdue
    if (s.debtTuition > 1000000) {
      return { label: 'Quá hạn', badgeClass: 'badge-danger' };
    }
    
    return { label: 'Chờ thanh toán', badgeClass: 'badge-primary' };
  };
 
  return (
    <div className="payments-container">
      {role === 'Gia sư' && (
        <div className="card text-warning" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, marginBottom: 16, backgroundColor: '#fffbeb', borderColor: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: '0.8rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          Chế độ chỉ xem (Read-only): Bạn có quyền xem toàn bộ đối soát thu chi của hệ thống Tin Học GenZ nhưng không thể thực hiện các thao tác ghi nhận thu, duyệt chi, chỉnh sửa hay xóa.
        </div>
      )}
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Đối soát Thu & Chi</h1>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {viewMode === 'card' 
              ? 'Tự động ưu tiên các khoản nợ học phí và chờ chi trả lên đầu' 
              : 'Quản lý danh sách biên lai thu học phí và các phiếu đề xuất chi'}
          </span>
        </div>
        
        {/* Toggle Mode Button Group */}
        <div className="view-mode-toggle-group" style={{ display: 'flex', gap: 8, background: '#f1f5f9', padding: 4, borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <button 
            type="button" 
            className={`btn btn-sm ${viewMode === 'card' ? 'btn-primary' : 'btn-outline'}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              border: 'none', 
              background: viewMode === 'card' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'card' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: viewMode === 'card' ? 'var(--shadow-sm)' : 'none'
            }}
            onClick={() => setViewMode('card')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
            Dạng thẻ
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              border: 'none', 
              background: viewMode === 'list' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'list' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none'
            }}
            onClick={() => setViewMode('list')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            Dạng danh sách
          </button>
        </div>
      </div>

      {/* Card View Layout */}
      {viewMode === 'card' && (
        <>
          {/* Search Bar with 3 independent filters */}
          <div className="search-filter-bar card" style={{ padding: '12px 16px' }}>
            <div className="search-input-wrapper">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm kiếm học viên theo tên hoặc mã số..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Student Tuition Filter */}
            <div className="select-wrapper">
              <select
                className="filter-select"
                value={cardTuitionFilter}
                onChange={(e) => setCardTuitionFilter(e.target.value)}
              >
                <option value="">Học viên: Tất cả</option>
                <option value="paid">Học viên: Đã đóng đủ</option>
                <option value="debt">Học viên: Còn nợ</option>
              </select>
            </div>

            {/* Tutor Payout Filter */}
            <div className="select-wrapper">
              <select
                className="filter-select"
                value={cardTutorFilter}
                onChange={(e) => setCardTutorFilter(e.target.value)}
              >
                <option value="">Chi Gia sư: Tất cả</option>
                <option value="paid">Chi Gia sư: Đã chi</option>
                <option value="unpaid">Chi Gia sư: Chưa chi</option>
              </select>
            </div>

            {/* Referral Payout Filter */}
            <div className="select-wrapper">
              <select
                className="filter-select"
                value={cardRefFilter}
                onChange={(e) => setCardRefFilter(e.target.value)}
              >
                <option value="">Chi Nguồn: Tất cả</option>
                <option value="paid">Chi Nguồn: Đã chi</option>
                <option value="unpaid">Chi Nguồn: Chưa chi</option>
              </select>
            </div>
          </div>

          {/* SaaS Grid of Financial Cards */}
          <div className="financial-cards-grid">
            {sortedStudents.map(s => {
              const tutorPayout = payouts.find(p => p.studentId === s.id && p.type === 'Gia sư');
              const refPayout = payouts.find(p => p.studentId === s.id && p.type === 'Nguồn giới thiệu');
              const studentReceipts = receipts.filter(r => r.studentId === s.id);
              const { label: statusLabel, badgeClass } = getFinancialStatus(s);

              // Find tutor and referral details
              const tutor = tutors.find(t => t.id === s.tutorId);
              const ref = referrals.find(r => r.id === s.referralId);

              return (
                <div className="financial-card-saas" key={s.id}>
                  {/* Header profile details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{s.id}</span>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0' }}>{s.name}</h3>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Môn học: {s.subjectId} • {s.learningFormat}</div>
                    </div>
                    <span className={`badge ${badgeClass}`} style={{ fontSize: '0.68rem' }}>{statusLabel}</span>
                  </div>

                  <div className="tutor-info-divider" style={{ margin: '6px 0' }}></div>

                  {/* Tuition Progress & Details */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>Tiến độ đóng học phí:</span>
                      <span style={{ fontWeight: 700 }}>{Math.round((s.paidTuition / s.totalTuition) * 100)}%</span>
                    </div>
                    <div className="progress-bar-container" style={{ height: 6, marginBottom: 6 }}>
                      <div className="progress-bar-fill" style={{ backgroundColor: 'var(--primary)', width: `${Math.min(100, (s.paidTuition / s.totalTuition) * 100)}%` }}></div>
                    </div>
                    
                    <div className="financial-card-grid-3">
                      <div className="financial-card-item">
                        <span className="detail-label">Tổng học phí</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{formatCurrency(s.totalTuition)}</span>
                      </div>
                      <div className="financial-card-item">
                        <span className="detail-label">Đã thu</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--success)' }}>{formatCurrency(s.paidTuition)}</span>
                      </div>
                      <div className="financial-card-item">
                        <span className="detail-label">Còn nợ</span>
                        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: s.debtTuition > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(s.debtTuition)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="tutor-info-divider" style={{ margin: '6px 0' }}></div>

                  {/* Payouts Section */}
                  <div className="financial-card-payouts">
                    {/* Tutor Payout */}
                    <div className="payout-box-saas">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Chi Gia sư:</span>
                        {(!tutor || !tutor.isPayable) ? (
                          <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.65rem', padding: '1px 5px', opacity: 0.8 }}>
                            GV Trung tâm
                          </span>
                        ) : (
                          <span className={`badge ${tutorPayout?.status === 'Đã thanh toán' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {tutorPayout ? tutorPayout.status : 'Chưa chi'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', opacity: (!tutor || !tutor.isPayable) ? 0.5 : 1 }}>
                          {tutorPayout ? formatCurrency(tutorPayout.amount) : '0 đ'}
                        </span>
                        {role === 'Admin' && tutor && tutor.isPayable && (
                          <button className="btn btn-outline btn-sm" style={{ padding: '1px 5px', fontSize: '0.65rem' }} onClick={() => handleOpenPayoutModal(s, 'Gia sư')}>
                            {tutorPayout ? 'Sửa' : 'Tạo'}
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>{tutor ? tutor.name : 'Chưa giao'}</span>
                    </div>

                    {/* Referral Payout */}
                    <div className="payout-box-saas">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-secondary)' }}>Chi Nguồn:</span>
                        {(!ref || !ref.isPayable) ? (
                          <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.65rem', padding: '1px 5px', opacity: 0.8 }}>
                            Không chi
                          </span>
                        ) : (
                          <span className={`badge ${refPayout?.status === 'Đã thanh toán' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                            {refPayout ? refPayout.status : 'Chưa chi'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', opacity: (!ref || !ref.isPayable) ? 0.5 : 1 }}>
                          {refPayout ? formatCurrency(refPayout.amount) : '0 đ'}
                        </span>
                        {role === 'Admin' && ref && ref.isPayable && (
                          <button className="btn btn-outline btn-sm" style={{ padding: '1px 5px', fontSize: '0.65rem' }} onClick={() => handleOpenPayoutModal(s, 'Nguồn giới thiệu')}>
                            {refPayout ? 'Sửa' : 'Tạo'}
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 1 }}>{ref ? ref.name : 'Chưa rõ'}</span>
                    </div>
                  </div>

                  <div className="tutor-info-divider" style={{ margin: '6px 0' }}></div>

                  {/* Transaction Timeline */}
                  <div className="financial-card-timeline">
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timeline giao dịch đóng phí</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {studentReceipts.slice(0, 2).map(r => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', backgroundColor: '#f8fafc', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {r.date} • {r.method}
                            {r.proofImg && (
                              <span 
                                title="Xem ảnh minh chứng" 
                                style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center' }} 
                                onClick={(e) => { e.stopPropagation(); setPreviewImage(r.proofImg); }}
                              >
                                🖼️
                              </span>
                            )}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--success)' }}>+{formatCurrency(r.amount)}</span>
                        </div>
                      ))}
                      {studentReceipts.length > 2 && (
                        <span className="text-primary" style={{ cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block', marginTop: 1 }} onClick={() => handleOpenReceiptsModal(s)}>
                          Xem thêm {studentReceipts.length - 2} biên lai...
                        </span>
                      )}
                      {studentReceipts.length === 0 && (
                        <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Chưa có giao dịch nộp phí.</span>
                      )}
                    </div>
                  </div>

                  {/* Receipts Manage Button */}
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-secondary btn-sm" style={{ width: '100%', padding: '5px' }} onClick={() => handleOpenReceiptsModal(s)}>
                      {role === 'Admin' ? `Quản lý Lịch sử đóng học phí (${studentReceipts.length})` : `Xem Lịch sử đóng học phí (${studentReceipts.length})`}
                    </button>
                  </div>
                </div>
              );
            })}
            {sortedStudents.length === 0 && (
              <div className="empty-state" style={{ gridColumn: 'span 3' }}>
                <p>Không tìm thấy học viên nào phù hợp!</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* List/Table View Layout */}
      {viewMode === 'list' && (
        <>
          {/* Sub-tabs Header & Filters Card */}
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div className="list-view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div className="sub-tabs" style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 8 }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ 
                    fontWeight: 700,
                    border: 'none',
                    background: activeSubTab === 'receipts' ? '#ffffff' : 'transparent',
                    color: activeSubTab === 'receipts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: activeSubTab === 'receipts' ? 'var(--shadow-sm)' : 'none'
                  }}
                  onClick={() => setActiveSubTab('receipts')}
                >
                  Biên lai học phí ({filteredReceipts.length})
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ 
                    fontWeight: 700,
                    border: 'none',
                    background: activeSubTab === 'payouts' ? '#ffffff' : 'transparent',
                    color: activeSubTab === 'payouts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: activeSubTab === 'payouts' ? 'var(--shadow-sm)' : 'none'
                  }}
                  onClick={() => setActiveSubTab('payouts')}
                >
                  Phiếu chi phí ({filteredPayouts.length})
                </button>
              </div>
              
              <div className="list-filters-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: 200, padding: '6px 12px', fontSize: '0.75rem' }}
                  placeholder="Tìm học viên..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                
                {activeSubTab === 'payouts' && (
                  <>
                    <select
                      className="form-control"
                      style={{ width: 130, padding: '6px 12px', fontSize: '0.75rem' }}
                      value={payoutTypeFilter}
                      onChange={e => setPayoutTypeFilter(e.target.value)}
                    >
                      <option value="">Phân loại: Tất cả</option>
                      <option value="Gia sư">Gia sư</option>
                      <option value="Nguồn giới thiệu">Nguồn giới thiệu</option>
                    </select>
                    <select
                      className="form-control"
                      style={{ width: 150, padding: '6px 12px', fontSize: '0.75rem' }}
                      value={payoutStatusFilter}
                      onChange={e => setPayoutStatusFilter(e.target.value)}
                    >
                      <option value="">Trạng thái: Tất cả</option>
                      <option value="Chưa thanh toán">Chưa thanh toán</option>
                      <option value="Đã thanh toán">Đã thanh toán</option>
                    </select>
                  </>
                )}
                
                {role === 'Admin' && (
                  activeSubTab === 'receipts' ? (
                    <button className="btn btn-sm btn-primary" style={{ padding: '6px 12px' }} onClick={handleOpenAddReceiptFlatModal}>
                      + Ghi nhận thu học phí
                    </button>
                  ) : (
                    <button className="btn btn-sm btn-primary" style={{ padding: '6px 12px' }} onClick={handleOpenAddPayoutFlatModal}>
                      + Tạo phiếu chi mới
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {activeSubTab === 'receipts' ? (
              <div className="table-responsive" style={{ margin: 0, border: 'none', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Mã biên lai</th>
                      <th>Học viên</th>
                      <th>Số tiền thu</th>
                      <th>Ngày nộp</th>
                      <th>Phương thức</th>
                      <th>Minh chứng</th>
                      <th>Ghi chú</th>
                      {role === 'Admin' && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReceipts.map(r => {
                      const student = students.find(s => s.id === r.studentId);
                      return (
                        <tr key={r.id}>
                          <td><span style={{ fontWeight: 700 }}>{r.id}</span></td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{r.studentId}</span>
                              <div style={{ fontWeight: 600 }}>{student ? student.name : 'Chưa rõ'}</div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>+{formatCurrency(r.amount)}</td>
                          <td>{r.date}</td>
                          <td><span className="badge badge-primary" style={{ textTransform: 'none' }}>{r.method}</span></td>
                          <td>
                            {r.proofImg ? (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '2px 6px', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setPreviewImage(r.proofImg)}
                              >
                                🖼️ Xem ảnh
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có</span>
                            )}
                          </td>
                          <td><span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{r.note || '-'}</span></td>
                          {role === 'Admin' && (
                            <td>
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '3px 8px' }}
                                  onClick={() => handleDeleteReceiptClick(r.id)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filteredReceipts.length === 0 && (
                      <tr>
                        <td colSpan={role === 'Admin' ? 8 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Không tìm thấy biên lai nào phù hợp!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive" style={{ margin: 0, border: 'none', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Mã phiếu chi</th>
                      <th>Học viên</th>
                      <th>Phân loại</th>
                      <th>Người nhận</th>
                      <th>Số tiền chi</th>
                      <th>Trạng thái</th>
                      <th>Giao dịch chi</th>
                      {role === 'Admin' && <th style={{ textAlign: 'right' }}>Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map(p => {
                      const student = students.find(s => s.id === p.studentId);
                      const recipientName = p.type === 'Gia sư'
                        ? (tutors.find(t => t.id === p.recipientId)?.name || p.recipientId)
                        : (referrals.find(r => r.id === p.recipientId)?.name || p.recipientId);
                      return (
                        <tr key={p.id}>
                          <td><span style={{ fontWeight: 700 }}>{p.id}</span></td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{p.studentId}</span>
                              <div style={{ fontWeight: 600 }}>{student ? student.name : 'Chưa rõ'}</div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${p.type === 'Gia sư' ? 'badge-primary' : 'badge-warning'}`} style={{ textTransform: 'none' }}>
                              {p.type}
                            </span>
                          </td>
                          <td>
                            <div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)' }}>{p.recipientId}</span>
                              <div style={{ fontWeight: 600 }}>{recipientName}</div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 800 }}>{formatCurrency(p.amount)}</td>
                          <td>
                            <span className={`badge ${p.status === 'Đã thanh toán' ? 'badge-success' : 'badge-danger'}`} style={{ textTransform: 'none' }}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {p.status === 'Đã thanh toán' ? (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                {p.date} • {p.method}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                Chưa chi trả
                              </span>
                            )}
                          </td>
                          {role === 'Admin' && (
                            <td>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                {p.status === 'Chưa thanh toán' && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '3px 8px' }}
                                    onClick={() => handleOpenProcessPayFlatModal(p)}
                                  >
                                    Thanh toán
                                  </button>
                                )}
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ padding: '3px 8px' }}
                                  onClick={() => handleOpenEditPayoutFromList(p)}
                                >
                                  Sửa
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '3px 8px' }}
                                  onClick={() => handleDeletePayoutClick(p.id)}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filteredPayouts.length === 0 && (
                      <tr>
                        <td colSpan={role === 'Admin' ? 8 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Không tìm thấy phiếu chi nào phù hợp!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================= MODAL PAYOUT (CHI GIA SƯ / CHI NGUỒN) ================= */}
      {showPayoutModal && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowPayoutModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {payoutModalConfig.id ? `Sửa Phiếu Chi: ${payoutModalConfig.id}` : 'Tạo Phiếu Chi Mới'}
              </h3>
              <button className="modal-close" onClick={() => setShowPayoutModal(false)}>&times;</button>
            </div>
            <form onSubmit={handlePayoutSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Học viên liên quan *</label>
                  {payoutModalConfig.id ? (
                    <input type="text" className="form-control" value={payoutModalConfig.studentName} disabled />
                  ) : (
                    <select
                      className="form-control"
                      value={payoutModalConfig.studentId}
                      onChange={e => handlePayoutFormStudentChange(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn học viên --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Phân loại chi phí *</label>
                    {payoutModalConfig.id ? (
                      <input type="text" className="form-control" value={payoutModalConfig.type} disabled />
                    ) : (
                      <select
                        className="form-control"
                        value={payoutModalConfig.type}
                        onChange={e => handlePayoutFormTypeChange(e.target.value)}
                        required
                      >
                        <option value="Gia sư">Gia sư</option>
                        <option value="Nguồn giới thiệu">Nguồn giới thiệu</option>
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Người nhận chi phí</label>
                    <input type="text" className="form-control" value={payoutModalConfig.recipientName} disabled />
                    {payoutModalConfig.type === 'Gia sư' && payoutModalConfig.studentId && (() => {
                      const student = students.find(s => s.id === payoutModalConfig.studentId);
                      const tutor = student ? tutors.find(t => t.id === student.tutorId) : null;
                      if (tutor && !tutor.isPayable) {
                        return (
                          <div style={{ color: 'var(--danger)', fontSize: '0.68rem', marginTop: 4, fontWeight: 600 }}>
                            ⚠️ Giáo viên này được cấu hình không chi trả lương!
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {payoutModalConfig.type === 'Nguồn giới thiệu' && payoutModalConfig.studentId && (() => {
                      const student = students.find(s => s.id === payoutModalConfig.studentId);
                      const ref = student ? referrals.find(r => r.id === student.referralId) : null;
                      if (ref && !ref.isPayable) {
                        return (
                          <div style={{ color: 'var(--danger)', fontSize: '0.68rem', marginTop: 4, fontWeight: 600 }}>
                            ⚠️ Nguồn giới thiệu này được cấu hình không chi trả hoa hồng!
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
 
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Số tiền chi trả (đ) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={payoutModalConfig.amount}
                      onChange={e => setPayoutModalConfig({ ...payoutModalConfig, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái thanh toán</label>
                    <select
                      className="form-control"
                      value={payoutModalConfig.status}
                      onChange={e => setPayoutModalConfig({ ...payoutModalConfig, status: e.target.value })}
                    >
                      <option value="Chưa thanh toán">Chưa thanh toán</option>
                      <option value="Đã thanh toán">Đã thanh toán</option>
                    </select>
                  </div>
                </div>
 
                {payoutModalConfig.status === 'Đã thanh toán' && (
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Ngày chi trả *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="DD/MM/YYYY"
                        value={payoutModalConfig.date}
                        onChange={e => setPayoutModalConfig({ ...payoutModalConfig, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phương thức chi</label>
                      <select
                        className="form-control"
                        value={payoutModalConfig.method}
                        onChange={e => setPayoutModalConfig({ ...payoutModalConfig, method: e.target.value })}
                      >
                        <option value="Chuyển khoản">Chuyển khoản</option>
                        <option value="Tiền mặt">Tiền mặt</option>
                      </select>
                    </div>
                  </div>
                )}
 
                <div className="form-group">
                  <label className="form-label">Ghi chú phiếu chi</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={payoutModalConfig.note}
                    onChange={e => setPayoutModalConfig({ ...payoutModalConfig, note: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowPayoutModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu phiếu chi</button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* ================= MODAL RECEIPTS (LỊCH SỬ NỘP HỌC PHÍ) ================= */}
      {showReceiptsModal && selectedStudent && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowReceiptsModal(false))}>
          <div className="modal-content" style={{ maxWidth: '650px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Biên lai nộp tiền</span>
                <h3 className="modal-title" style={{ fontSize: '1.05rem', fontWeight: 800 }}>Lịch sử đóng: {selectedStudent.name}</h3>
              </div>
              <button className="modal-close" onClick={() => setShowReceiptsModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body">
              {/* Financial Balance Summary inside modal */}
              <div className="financial-card-grid-3" style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid var(--border-color)', marginBottom: 20 }}>
                <div className="financial-card-item">
                  <span className="detail-label" style={{ fontSize: '0.65rem' }}>Tổng học phí</span>
                  <span style={{ fontWeight: 700, fontSize: '0.825rem' }}>{formatCurrency(selectedStudent.totalTuition)}</span>
                </div>
                <div className="financial-card-item">
                  <span className="detail-label" style={{ fontSize: '0.65rem' }}>Đã nộp</span>
                  <span style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--success)' }}>{formatCurrency(selectedStudent.paidTuition)}</span>
                </div>
                <div className="financial-card-item">
                  <span className="detail-label" style={{ fontSize: '0.65rem' }}>Còn thiếu</span>
                  <span style={{ fontWeight: 700, fontSize: '0.825rem', color: selectedStudent.debtTuition > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(selectedStudent.debtTuition)}</span>
                </div>
              </div>
 
              <div className={role === 'Admin' ? 'grid-2' : ''} style={{ gap: 20 }}>
                {/* Receipts Timeline Log List */}
                <div style={role !== 'Admin' ? { width: '100%' } : {}}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Danh sách biên lai</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '220px', overflowY: 'auto' }}>
                    {receipts.filter(r => r.studentId === selectedStudent.id).map(r => (
                      <div key={r.id} style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{r.date} • {r.method}</div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>{r.note}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.78rem' }}>+{formatCurrency(Number(r.amount))}</span>
                          {role === 'Admin' && (
                            <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', padding: '2px 4px', border: 'none' }} onClick={() => handleDeleteReceiptClick(r.id)}>&times;</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {receipts.filter(r => r.studentId === selectedStudent.id).length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: 20, textAlign: 'center' }}>Chưa có giao dịch đóng tiền nào!</p>
                    )}
                  </div>
                </div>
  
                {/* Add new Receipt form */}
                {role === 'Admin' && (
                  <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: 20 }}>
                    <h4 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>Nạp tiền đóng học phí</h4>
                    <form onSubmit={handleAddReceiptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div className="form-group">
                        <label className="form-label">Số tiền đóng (đ) *</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Ví dụ: 1000000"
                          value={newReceiptForm.amount}
                          onChange={e => setNewReceiptForm({ ...newReceiptForm, amount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ngày đóng tiền *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="DD/MM/YYYY"
                          value={newReceiptForm.date}
                          onChange={e => setNewReceiptForm({ ...newReceiptForm, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phương thức đóng</label>
                        <select
                          className="form-control"
                          value={newReceiptForm.method}
                          onChange={e => setNewReceiptForm({ ...newReceiptForm, method: e.target.value })}
                        >
                          <option value="Chuyển khoản">Chuyển khoản</option>
                          <option value="Tiền mặt">Tiền mặt</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newReceiptForm.note}
                          onChange={e => setNewReceiptForm({ ...newReceiptForm, note: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Ảnh minh chứng chuyển khoản/tiền mặt</label>
                        <input
                          id="receipt-proof-input"
                          type="file"
                          accept="image/*"
                          className="form-control"
                          onChange={e => handleFileChange(e, setNewReceiptForm)}
                        />
                        {newReceiptForm.proofImg && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={newReceiptForm.proofImg} alt="Preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Đã chọn ảnh</span>
                            <button 
                              type="button" 
                              className="btn btn-outline btn-sm" 
                              style={{ color: 'var(--danger)', padding: '2px 6px', fontSize: '0.65rem' }}
                              onClick={() => {
                                setNewReceiptForm(prev => ({ ...prev, proofImg: '' }));
                                const el = document.getElementById('receipt-proof-input');
                                if (el) el.value = '';
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }}>Ghi nhận đóng học phí</button>
                    </form>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowReceiptsModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL FLAT RECEIPTS (GHI NHẬN THU HỌC PHÍ PHẲNG) ================= */}
      {showAddReceiptFlatModal && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowAddReceiptFlatModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Ghi nhận Thu học phí</h3>
              <button className="modal-close" onClick={() => setShowAddReceiptFlatModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFlatReceiptSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Học viên đóng phí *</label>
                  <select
                    className="form-control"
                    value={flatReceiptForm.studentId}
                    onChange={e => setFlatReceiptForm({ ...flatReceiptForm, studentId: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn học viên --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.id} - {s.name} (Nợ: {formatCurrency(s.debtTuition)})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Số tiền thu học phí (đ) *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Ví dụ: 1000000"
                    value={flatReceiptForm.amount}
                    onChange={e => setFlatReceiptForm({ ...flatReceiptForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Ngày nộp tiền *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="DD/MM/YYYY"
                      value={flatReceiptForm.date}
                      onChange={e => setFlatReceiptForm({ ...flatReceiptForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phương thức thanh toán</label>
                    <select
                      className="form-control"
                      value={flatReceiptForm.method}
                      onChange={e => setFlatReceiptForm({ ...flatReceiptForm, method: e.target.value })}
                    >
                      <option value="Chuyển khoản">Chuyển khoản</option>
                      <option value="Tiền mặt">Tiền mặt</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <input
                    type="text"
                    className="form-control"
                    value={flatReceiptForm.note}
                    onChange={e => setFlatReceiptForm({ ...flatReceiptForm, note: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Ảnh minh chứng chuyển khoản/tiền mặt</label>
                  <input
                    id="flat-receipt-proof-input"
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={e => handleFileChange(e, setFlatReceiptForm)}
                  />
                  {flatReceiptForm.proofImg && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={flatReceiptForm.proofImg} alt="Preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-color)' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Đã chọn ảnh</span>
                      <button 
                        type="button" 
                        className="btn btn-outline btn-sm" 
                        style={{ color: 'var(--danger)', padding: '2px 6px', fontSize: '0.65rem' }}
                        onClick={() => {
                          setFlatReceiptForm(prev => ({ ...prev, proofImg: '' }));
                          const el = document.getElementById('flat-receipt-proof-input');
                          if (el) el.value = '';
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddReceiptFlatModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Ghi nhận biên lai</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL FLAT PROCESS PAY (DUYỆT CHI THANH TOÁN PHẲNG) ================= */}
      {showProcessPayFlatModal && flatPayoutToProcess && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowProcessPayFlatModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Duyệt chi thanh toán</h3>
              <button className="modal-close" onClick={() => setShowProcessPayFlatModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleFlatProcessPaySubmit}>
              <div className="modal-body">
                <p style={{ fontSize: '0.8rem', marginBottom: 16, lineHeight: 1.5 }}>
                  Bạn đang thực hiện thanh toán số tiền{' '}
                  <strong style={{ color: 'var(--primary)' }}>
                    {formatCurrency(flatPayoutToProcess.amount)}
                  </strong>{' '}
                  cho{' '}
                  <strong>
                    {flatPayoutToProcess.type} ({flatPayoutToProcess.recipientId})
                  </strong>{' '}
                  liên quan đến học viên{' '}
                  <strong>{flatPayoutToProcess.studentId}</strong>.
                </p>

                <div className="form-group">
                  <label className="form-label">Ngày thực hiện giao dịch chi *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="DD/MM/YYYY"
                    value={flatProcessForm.date}
                    onChange={e => setFlatProcessForm({ ...flatProcessForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phương thức giao dịch chi</label>
                  <select
                    className="form-control"
                    value={flatProcessForm.method}
                    onChange={e => setFlatProcessForm({ ...flatProcessForm, method: e.target.value })}
                  >
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowProcessPayFlatModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-success">Duyệt chi</button>
              </div>
            </form>
          </div>
        </div>
      )}
 
      {/* ================= CONFIRM DIALOGS ================= */}
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
        .financial-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 1200px) {
          .financial-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .financial-cards-grid {
            grid-template-columns: 1fr;
          }
        }
 
        .financial-card-saas {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
          padding: 12px;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-card);
          transition: var(--transition);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .financial-card-saas:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: rgba(37, 99, 235, 0.12);
        }
 
        .financial-card-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .financial-card-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background-color: #f8fafc;
          padding: 4px 6px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }
 
        .financial-card-payouts {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
 
        .payout-box-saas {
          background-color: #f8fafc;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
 
        .timeline-item-inline {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          background-color: #f8fafc;
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        @media (max-width: 480px) {
          .financial-card-grid-3 {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .financial-card-payouts {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .financial-card-item {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            padding: 6px 10px;
          }
        }
      `}</style>
      
      {previewImage && (
        <div className="modal-overlay" {...handleBackdropClick(() => setPreviewImage(null))} style={{ zIndex: 1100 }}>
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
 
export default Payments;
