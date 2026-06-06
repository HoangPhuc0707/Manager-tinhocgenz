import { useEffect, useState } from 'react';
import { getLessons, updateLesson, deleteLesson, getStudents, getTutors, getSubjects, addLessonsBatch } from '../services/db';
import ConfirmModal from './ConfirmModal';
import { handleBackdropClick } from '../utils/modalHelper';
import '../styles/theme.css';

// Conflict Checker Algorithm
const checkLessonConflicts = (lesson, allLessons, students) => {
  if (!lesson || !lesson.dateTime || !lesson.endTime) return { hasConflict: false };

  const dateStr = lesson.dateTime.split('T')[0];
  const timeStr = lesson.dateTime.split('T')[1]?.slice(0, 5);
  if (!timeStr) return { hasConflict: false };

  // Convert current lesson times to minutes since midnight
  const [sh, sm] = timeStr.split(':').map(Number);
  const sTime = sh * 60 + sm;

  const [eh, em] = lesson.endTime.split(':').map(Number);
  const eTime = eh * 60 + em;

  // Filter other lessons on the same day sharing tutor OR student
  const otherLessons = allLessons.filter(l =>
    l.id !== lesson.id &&
    l.dateTime.split('T')[0] === dateStr &&
    (l.tutorId === lesson.tutorId || l.studentId === lesson.studentId)
  );

  for (const other of otherLessons) {
    const oTimeStr = other.dateTime.split('T')[1]?.slice(0, 5);
    const oEndStr = other.endTime || '21:00';
    if (!oTimeStr) continue;

    const [osh, osm] = oTimeStr.split(':').map(Number);
    const osTime = osh * 60 + osm;

    const [oeh, oem] = oEndStr.split(':').map(Number);
    const oeTime = oeh * 60 + oem;

    // 1. Check overlap: max(start1, start2) < min(end1, end2)
    const overlap = Math.max(sTime, osTime) < Math.min(eTime, oeTime);
    if (overlap) {
      const student = students.find(s => s.id === other.studentId);
      return {
        hasConflict: true,
        type: 'overlap',
        message: `Trùng lịch hoàn toàn với buổi học (${oTimeStr} - ${oEndStr}) của học viên ${student ? student.name : other.studentId}`,
        otherId: other.id
      };
    }

    // 2. Check consecutive / close: gap < 20 mins
    // Gap = current_start - other_end OR other_start - current_end
    const gap = sTime >= oeTime ? sTime - oeTime : osTime - eTime;
    if (gap >= 0 && gap < 20) {
      const student = students.find(s => s.id === other.studentId);
      return {
        hasConflict: true,
        type: 'consecutive',
        message: `Sát lịch (cách chỉ ${gap} phút) với buổi học (${oTimeStr} - ${oEndStr}) của học viên ${student ? student.name : other.studentId}`,
        otherId: other.id,
        gap
      };
    }
  }

  return { hasConflict: false };
};

const CalendarView = ({ role, activeTutorId, triggerToast }) => {
  const [lessons, setLessons] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Calendar State: Month is 0-indexed (June = 5)
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // Default June 2026

  // Filtering for Admin
  const [filterTutorId, setFilterTutorId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Confirm Delete Modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Add Lesson Form State
  const [newLessonForm, setNewLessonForm] = useState({
    studentId: '',
    time: '19:30',
    endTime: '21:00',
    date: '2026-06-03',
    learningFormat: 'Offline',
    address: '',
    note: ''
  });

  // Batch scheduling states
  const [schedulingMode, setSchedulingMode] = useState('single'); // 'single', 'multiple', 'recurring'
  const [selectedDates, setSelectedDates] = useState([]); // for 'multiple' mode
  const [selectedDatesInput, setSelectedDatesInput] = useState(''); // input date buffer
  const [recurringDays, setRecurringDays] = useState([]); // for 'recurring' mode (0 = Sun, 1 = Mon...)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Edit Lesson Form State (Attendance, Date, Time & Note)
  const [editLessonForm, setEditLessonForm] = useState({
    status: 'Chưa diễn ra',
    learningFormat: 'Offline',
    address: '',
    note: '',
    date: '',
    time: '',
    endTime: ''
  });

  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  // Resolve base API url
  const apiBaseUrl = import.meta.env.VITE_API_URL || 
    (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000/api'
      : '/api');

  // Construct standard calendar feed URLs
  const getAbsoluteFeedUrl = (isWebcal = false) => {
    if (!activeTutorId) return '';
    const feedUrl = apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')
      ? `${apiBaseUrl}/calendar/feed/${activeTutorId}.ics`
      : `${window.location.origin}${apiBaseUrl}/calendar/feed/${activeTutorId}.ics`;
    
    if (isWebcal) {
      return feedUrl.replace(/^https?:\/\//i, 'webcal://');
    }
    return feedUrl;
  };

  const handleCopyUrl = () => {
    const url = getAbsoluteFeedUrl(false);
    navigator.clipboard.writeText(url);
    setCopied(true);
    triggerToast('Đã sao chép liên kết đồng bộ lịch!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const fetchData = async () => {
      const l = await getLessons();
      const s = await getStudents();
      const t = await getTutors();
      const sub = await getSubjects();
      setLessons(l);
      setStudents(s);
      setTutors(t);
      setSubjects(sub);
    };
    fetchData();
  }, [role, activeTutorId, refreshTrigger]);

  // Helper date parsing
  const formatIsoDate = (year, month, day) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Filter lessons based on role and active selection
  const filteredLessons = lessons.filter(lesson => {
    // If Tutor: only see their own lessons
    if (role === 'Gia sư') {
      return lesson.tutorId === activeTutorId;
    }
    // If Admin: apply filters
    let match = true;
    if (filterTutorId) match = match && lesson.tutorId === filterTutorId;
    if (filterStudentId) match = match && lesson.studentId === filterStudentId;
    return match;
  });

  const activeTutorStudents = role === 'Gia sư'
    ? students.filter(s => s.tutorId === activeTutorId && !['Tạm dừng', 'Đã tốt nghiệp'].includes(s.status))
    : students.filter(s => !['Tạm dừng', 'Đã tốt nghiệp'].includes(s.status));

  const openAddModal = (dateStr) => {
    const formattedDate = dateStr || formatIsoDate(currentDate.getFullYear(), currentDate.getMonth(), 1);
    setSelectedDateStr(formattedDate);

    const defaultStudentId = activeTutorStudents[0]?.id || '';
    const student = students.find(s => s.id === defaultStudentId);

    setNewLessonForm({
      studentId: defaultStudentId,
      time: '19:30',
      endTime: '21:00',
      date: formattedDate,
      learningFormat: student ? student.learningFormat : 'Offline',
      address: student ? student.address : '',
      note: ''
    });

    setSchedulingMode('single');
    setSelectedDates([formattedDate]);
    setSelectedDatesInput(formattedDate);
    setRecurringDays([]);
    setStartDate(formattedDate);
    
    const d = new Date(formattedDate);
    d.setDate(d.getDate() + 14);
    const endFormattedStr = formatIsoDate(d.getFullYear(), d.getMonth(), d.getDate());
    setEndDate(endFormattedStr);

    setShowAddModal(true);
  };

  // Handle cell click
  const handleCellClick = (day) => {
    openAddModal(formatIsoDate(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  const handleStudentChange = (studentId) => {
    const student = students.find(s => s.id === studentId);
    setNewLessonForm(prev => ({
      ...prev,
      studentId,
      learningFormat: student ? student.learningFormat : 'Offline',
      address: student ? student.address : ''
    }));
  };

  // Handle event click
  const handleEventClick = (e, lesson) => {
    e.stopPropagation(); // Avoid triggering cell click
    setSelectedLesson(lesson);
    setEditLessonForm({
      status: lesson.status,
      learningFormat: lesson.learningFormat || 'Offline',
      address: lesson.address || '',
      note: lesson.note || '',
      date: lesson.dateTime.split('T')[0],
      time: lesson.dateTime.split('T')[1]?.slice(0, 5) || '19:30',
      endTime: lesson.endTime || '21:00'
    });
    setShowDetailModal(true);
  };

  // Add Lesson Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newLessonForm.studentId) {
      triggerToast('Vui lòng chọn học viên!', 'danger');
      return;
    }

    const student = students.find(s => s.id === newLessonForm.studentId);
    if (!student) return;

    // A Tutor can only schedule for their own students
    const tutorId = role === 'Gia sư' ? activeTutorId : student.tutorId;

    if (!tutorId) {
      triggerToast('Học viên này chưa được gán gia sư phụ trách!', 'danger');
      return;
    }

    // Validate times
    if (newLessonForm.time >= newLessonForm.endTime) {
      triggerToast('Giờ kết thúc phải sau giờ bắt đầu!', 'danger');
      return;
    }

    let datesToRegister = [];

    if (schedulingMode === 'single') {
      datesToRegister = [newLessonForm.date];
    } else if (schedulingMode === 'multiple') {
      if (selectedDates.length === 0) {
        triggerToast('Vui lòng chọn ít nhất một ngày học!', 'danger');
        return;
      }
      datesToRegister = [...selectedDates];
    } else if (schedulingMode === 'recurring') {
      if (recurringDays.length === 0) {
        triggerToast('Vui lòng chọn ít nhất một thứ trong tuần!', 'danger');
        return;
      }
      if (!startDate || !endDate) {
        triggerToast('Vui lòng điền đầy đủ từ ngày và đến ngày!', 'danger');
        return;
      }
      if (startDate > endDate) {
        triggerToast('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu!', 'danger');
        return;
      }

      // Generate dates matching selection
      const dates = [];
      let current = new Date(startDate);
      const last = new Date(endDate);
      let limit = 0;
      while (current <= last && limit < 100) {
        const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon...
        if (recurringDays.includes(dayOfWeek)) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          dates.push(`${year}-${month}-${day}`);
        }
        current.setDate(current.getDate() + 1);
        limit++;
      }

      if (dates.length === 0) {
        triggerToast('Không tìm thấy ngày nào phù hợp trong khoảng thời gian đã chọn!', 'danger');
        return;
      }
      datesToRegister = dates;
    }

    const lessonsToCreate = datesToRegister.map(d => ({
      tutorId,
      studentId: student.id,
      dateTime: `${d}T${newLessonForm.time}`,
      endTime: newLessonForm.endTime,
      learningFormat: newLessonForm.learningFormat,
      address: newLessonForm.address,
      status: 'Chưa diễn ra',
      note: newLessonForm.note
    }));

    // Check conflicts
    let conflictCount = 0;
    for (const item of lessonsToCreate) {
      const conflict = checkLessonConflicts(item, lessons, students);
      if (conflict.hasConflict && conflict.type === 'overlap') {
        conflictCount++;
      }
    }

    try {
      await addLessonsBatch(lessonsToCreate);
      triggerToast(`Đã thêm thành công ${lessonsToCreate.length} buổi học mới!`, 'success');
      if (conflictCount > 0) {
        triggerToast(`Lưu ý: Có ${conflictCount} buổi bị trùng/sát lịch dạy. Vui lòng kiểm tra lại!`, 'warning');
      }
      setShowAddModal(false);
      setSelectedDates([]);
      setRecurringDays([]);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  // Edit Lesson Submit (Attendance, Date, Time & Note)
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLesson) return;

    if (editLessonForm.time >= editLessonForm.endTime) {
      triggerToast('Giờ kết thúc phải sau giờ bắt đầu!', 'danger');
      return;
    }

    try {
      await updateLesson(selectedLesson.id, {
        status: editLessonForm.status,
        learningFormat: editLessonForm.learningFormat,
        address: editLessonForm.address,
        note: editLessonForm.note,
        dateTime: `${editLessonForm.date}T${editLessonForm.time}`,
        endTime: editLessonForm.endTime
      });
      triggerToast('Đã cập nhật lịch học và điểm danh!', 'success');
      setShowDetailModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      triggerToast(err.message, 'danger');
    }
  };

  // Delete Lesson
  const handleDeleteLesson = () => {
    if (!selectedLesson) return;
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedLesson) {
      await deleteLesson(selectedLesson.id);
      triggerToast('Đã xóa buổi học thành công!', 'success');
      setShowDetailModal(false);
      setConfirmOpen(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Calendar cells calculation (42 cells: Mon-Sun)
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun

  // Offset to start on Monday
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const cells = [];

  // Prefix from previous month
  for (let i = adjustedFirstDayIndex; i > 0; i--) {
    cells.push({
      day: prevMonthDays - i + 1,
      isCurrentMonth: false,
      dateStr: formatIsoDate(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, prevMonthDays - i + 1)
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      isCurrentMonth: true,
      dateStr: formatIsoDate(year, month, i)
    });
  }

  // Suffix from next month
  const totalCells = 42;
  const suffixDays = totalCells - cells.length;
  for (let i = 1; i <= suffixDays; i++) {
    cells.push({
      day: i,
      isCurrentMonth: false,
      dateStr: formatIsoDate(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, i)
    });
  }


  const selectedDateLessons = filteredLessons
    .filter(lesson => {
      return lesson.dateTime.split('T')[0] === (selectedDateStr || formatIsoDate(currentDate.getFullYear(), currentDate.getMonth(), 1));
    })
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));

  return (
    <div className="calendar-page-container">
      <div className="page-header">
        <h1 className="page-title">Lịch biểu giảng dạy</h1>
        <div className="page-actions">
          <div className="calendar-nav-buttons" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={prevMonth}>Tháng trước</button>
            <span className="current-month-label">
              Tháng {month + 1} / {year}
            </span>
            <button className="btn btn-outline btn-sm" onClick={nextMonth}>Tháng sau</button>
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal(selectedDateStr)}>+ Thêm lịch</button>
          </div>
        </div>
      </div>

      {/* Calendar Sync Widget */}
      {role === 'Gia sư' && activeTutorId && (
        <div className="calendar-sync-widget card" style={{ marginBottom: 20, padding: '16px 20px', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.4rem' }}>📅</span>
              <div>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Đồng bộ lịch dạy với iPhone & Google Calendar
                </h4>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Lịch học sẽ tự động cập nhật trên điện thoại của bạn mỗi khi bạn lên lịch mới.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                type="button"
                className="btn btn-secondary btn-sm" 
                onClick={() => setShowSyncInfo(!showSyncInfo)}
                style={{ height: '32px', borderRadius: '8px' }}
              >
                {showSyncInfo ? 'Đóng hướng dẫn' : 'Thiết lập ngay'}
              </button>
            </div>
          </div>

          {showSyncInfo && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)', animation: 'fadeIn 0.25s ease' }}>
              <div className="grid-2">
                {/* Method 1: iPhone / Apple Calendar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <h5 style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🍎</span> Cách 1: Đồng bộ trực tiếp với iPhone (Apple Calendar)
                  </h5>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Nhập trực tiếp từ iPhone của bạn bằng Safari và nhấn nút bên dưới để tự động thêm lịch dạy.
                  </p>
                  <a 
                    href={getAbsoluteFeedUrl(true)}
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: 4, height: '32px', borderRadius: '8px', textDecoration: 'none' }}
                  >
                    📲 Đồng bộ nhanh trên iPhone
                  </a>
                </div>

                {/* Method 2: Google Calendar / Others */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: '8px' }}>
                  <h5 style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--success)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🤖</span> Cách 2: Đồng bộ với Google Calendar / Android
                  </h5>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Sao chép đường dẫn bên dưới, mở <strong>Google Calendar</strong> trên web, chọn <strong>"Lịch khác" (+)</strong> &rarr; Chọn <strong>"Từ URL"</strong> và dán vào.
                  </p>
                  
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={getAbsoluteFeedUrl(false)} 
                      readOnly 
                      onClick={(e) => e.target.select()}
                      style={{ fontSize: '0.68rem', padding: '6px 10px', height: '32px', borderRadius: '8px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                    <button 
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleCopyUrl}
                      style={{ height: '32px', whiteSpace: 'nowrap', borderRadius: '8px', borderColor: copied ? 'var(--success)' : 'var(--border-color)', color: copied ? 'var(--success)' : 'var(--text-primary)' }}
                    >
                      {copied ? '✓ Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>

              {/* IOS Step-by-step note */}
              <div style={{ marginTop: 16, padding: '10px 14px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  <strong>💡 Hướng dẫn thêm Lịch thủ công trên iPhone (nếu không dùng được nút đồng bộ nhanh):</strong><br />
                  Vào <strong>Cài đặt</strong> trên iPhone &rarr; Chọn <strong>Lịch</strong> &rarr; <strong>Tài khoản</strong> &rarr; <strong>Thêm tài khoản</strong> &rarr; Chọn <strong>Khác</strong> &rarr; Chọn <strong>Thêm Lịch đã đăng ký</strong> &rarr; Dán đường dẫn đã sao chép ở trên và nhấn <strong>Lưu</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Filters */}
      {role === 'Admin' && (
        <div className="search-filter-bar card" style={{ padding: 12, marginBottom: 20 }}>
          <div className="select-wrapper">
            <span className="select-label">Lọc Gia sư:</span>
            <select className="filter-select" value={filterTutorId} onChange={e => setFilterTutorId(e.target.value)}>
              <option value="">Tất cả gia sư</option>
              {tutors.map(t => (
                <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
              ))}
            </select>
          </div>
          <div className="select-wrapper">
            <span className="select-label">Lọc Học viên:</span>
            <select className="filter-select" value={filterStudentId} onChange={e => setFilterStudentId(e.target.value)}>
              <option value="">Tất cả học viên</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Calendar Grid Container */}
      <div className="calendar-container">
        <div className="calendar-grid">
          {/* Weekdays */}
          {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}

          {/* Days */}
          {cells.map((cell, idx) => {
            const dateObj = new Date(cell.dateStr);
            const isToday = new Date().toDateString() === dateObj.toDateString();
            const isSelected = selectedDateStr === cell.dateStr;

            const dayLessons = filteredLessons
              .filter(lesson => {
                return lesson.dateTime.split('T')[0] === cell.dateStr;
              })
              .sort((a, b) => a.dateTime.localeCompare(b.dateTime));

            return (
              <div
                key={idx}
                className={`calendar-cell ${cell.isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => cell.isCurrentMonth && handleCellClick(cell.day)}
              >
                <span className="calendar-date">{cell.day}</span>
                <div className="calendar-events">
                  {dayLessons.map(lesson => {
                    const student = students.find(s => s.id === lesson.studentId);
                    const timeStr = lesson.dateTime.split('T')[1]?.slice(0, 5) || '19:30';
                    const endTimeStr = lesson.endTime || '21:00';

                    let statusClass = 'scheduled';
                    if (lesson.status === 'Có học') statusClass = 'attended';
                    if (lesson.status === 'Vắng học / Hủy buổi') statusClass = 'absent';

                    // Check conflict
                    const conflictInfo = checkLessonConflicts(lesson, lessons, students);
                    const conflictClass = conflictInfo.hasConflict ? `has-conflict conflict-${conflictInfo.type}` : '';

                    return (
                      <div
                        key={lesson.id}
                        className={`calendar-event-pill ${statusClass} ${conflictClass}`}
                        onClick={(e) => handleEventClick(e, lesson)}
                        title={conflictInfo.hasConflict ? `${conflictInfo.message}` : `${timeStr} - ${endTimeStr} | ${student ? student.name : '...'}`}
                      >
                        <strong>{timeStr}-{endTimeStr}{conflictInfo.hasConflict && ' ⚠️'}</strong> {student ? student.name : 'Học sinh'}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Selected Date Lessons List */}
      <div className="mobile-lessons-container">
        <div className="mobile-lessons-header">
          <h3 className="mobile-lessons-title">
            Lịch học ngày {selectedDateStr ? selectedDateStr.split('-').reverse().join('/') : 'chưa chọn'}
          </h3>
          {selectedDateStr && (
            <button className="btn btn-primary btn-sm" onClick={() => openAddModal(selectedDateStr)}>
              + Lên lịch
            </button>
          )}
        </div>
        
        <div className="mobile-lessons-list">
          {selectedDateLessons.length === 0 ? (
            <div className="mobile-no-lessons">
              Không có lịch học nào trong ngày này. Chạm vào ô ngày khác hoặc click "+ Lên lịch" để thêm.
            </div>
          ) : (
            selectedDateLessons.map(lesson => {
              const student = students.find(s => s.id === lesson.studentId);
              const tutor = tutors.find(t => t.id === lesson.tutorId);
              const timeStr = lesson.dateTime.split('T')[1]?.slice(0, 5) || '19:30';
              const endTimeStr = lesson.endTime || '21:00';
              
              let statusClass = 'scheduled';
              let statusLabel = 'Sắp diễn ra';
              if (lesson.status === 'Có học') {
                statusClass = 'attended';
                statusLabel = 'Có học';
              }
              if (lesson.status === 'Vắng học / Hủy buổi') {
                statusClass = 'absent';
                statusLabel = 'Hủy / Vắng';
              }
              
              const conflictInfo = checkLessonConflicts(lesson, lessons, students);

              return (
                <div 
                  key={lesson.id} 
                  className={`mobile-lesson-card ${statusClass} ${conflictInfo.hasConflict ? 'has-conflict' : ''}`}
                  onClick={(e) => handleEventClick(e, lesson)}
                >
                  <div className="mobile-lesson-card-header">
                    <span className="time">{timeStr} - {endTimeStr}</span>
                    <span className={`badge badge-${statusClass === 'attended' ? 'success' : statusClass === 'absent' ? 'danger' : 'primary'}`}>{statusLabel}</span>
                  </div>
                  <div className="mobile-lesson-card-body">
                    <div className="detail-row">
                      <span className="label">Học viên:</span>
                      <span className="value"><strong>{student ? student.name : '...'}</strong> ({lesson.studentId})</span>
                    </div>
                    {role === 'Admin' && (
                      <div className="detail-row">
                        <span className="label">Gia sư:</span>
                        <span className="value">{tutor ? tutor.name : '...'}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Địa điểm:</span>
                      <span className="value">{lesson.learningFormat} • {lesson.address}</span>
                    </div>
                    {lesson.note && (
                      <div className="detail-row">
                        <span className="label">Ghi chú:</span>
                        <span className="value">{lesson.note}</span>
                      </div>
                    )}
                    {conflictInfo.hasConflict && (
                      <div className="mobile-conflict-alert">
                        ⚠️ <strong>Trùng/Sát lịch:</strong> {conflictInfo.message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ================= MODAL ADD LESSON ================= */}
      {showAddModal && (
        <div className="modal-overlay" {...handleBackdropClick(() => setShowAddModal(false))}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Lên lịch học - Ngày {selectedDateStr.split('-').reverse().join('/')}</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {activeTutorStudents.length === 0 ? (
                  <p className="text-danger" style={{ fontWeight: 600 }}>
                    Bạn chưa có học viên nào đang học để lên lịch dạy! Vui lòng liên hệ Admin phân lớp.
                  </p>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Chọn học viên của bạn *</label>
                      <select
                        className="form-control"
                        value={newLessonForm.studentId}
                        onChange={e => handleStudentChange(e.target.value)}
                        required
                      >
                        {activeTutorStudents.map(s => {
                          const sub = subjects.find(sub => sub.id === s.subjectId);
                          return (
                            <option key={s.id} value={s.id}>
                              {s.id} - {s.name} ({sub ? sub.name : 'Môn học'})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Giờ bắt đầu *</label>
                        <input
                          type="time"
                          className="form-control"
                          value={newLessonForm.time}
                          onChange={e => setNewLessonForm({ ...newLessonForm, time: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Giờ kết thúc *</label>
                        <input
                          type="time"
                          className="form-control"
                          value={newLessonForm.endTime}
                          onChange={e => setNewLessonForm({ ...newLessonForm, endTime: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                      <label className="form-label">Chế độ lên lịch học</label>
                      <div className="tab-container" style={{ marginBottom: 0, display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          className={`tab-item ${schedulingMode === 'single' ? 'active' : ''}`}
                          onClick={() => setSchedulingMode('single')}
                          style={{ flex: 1, padding: '8px 12px', background: 'none', border: 'none', borderBottom: schedulingMode === 'single' ? '2px solid var(--primary)' : '2px solid transparent', color: schedulingMode === 'single' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          Một buổi
                        </button>
                        <button
                          type="button"
                          className={`tab-item ${schedulingMode === 'multiple' ? 'active' : ''}`}
                          onClick={() => setSchedulingMode('multiple')}
                          style={{ flex: 1, padding: '8px 12px', background: 'none', border: 'none', borderBottom: schedulingMode === 'multiple' ? '2px solid var(--primary)' : '2px solid transparent', color: schedulingMode === 'multiple' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          Chọn nhiều ngày
                        </button>
                        <button
                          type="button"
                          className={`tab-item ${schedulingMode === 'recurring' ? 'active' : ''}`}
                          onClick={() => setSchedulingMode('recurring')}
                          style={{ flex: 1, padding: '8px 12px', background: 'none', border: 'none', borderBottom: schedulingMode === 'recurring' ? '2px solid var(--primary)' : '2px solid transparent', color: schedulingMode === 'recurring' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.74rem', cursor: 'pointer' }}
                        >
                          Định kỳ hàng tuần
                        </button>
                      </div>
                    </div>

                    {schedulingMode === 'single' && (
                      <div className="grid-2">
                        <div className="form-group">
                          <label className="form-label">Ngày học *</label>
                          <input
                            type="date"
                            className="form-control"
                            value={newLessonForm.date}
                            onChange={e => setNewLessonForm({ ...newLessonForm, date: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Hình thức học buổi này</label>
                          <select
                            className="form-control"
                            value={newLessonForm.learningFormat}
                            onChange={e => setNewLessonForm({ ...newLessonForm, learningFormat: e.target.value })}
                          >
                            <option value="Offline">Offline (Trực tiếp)</option>
                            <option value="Online">Online (Trực tuyến)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {schedulingMode === 'multiple' && (
                      <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 16 }}>
                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label">Chọn ngày học</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <input
                                type="date"
                                className="form-control"
                                value={selectedDatesInput}
                                onChange={e => setSelectedDatesInput(e.target.value)}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ borderRadius: '8px' }}
                                onClick={() => {
                                  if (!selectedDatesInput) return;
                                  if (!selectedDates.includes(selectedDatesInput)) {
                                    setSelectedDates([...selectedDates, selectedDatesInput].sort());
                                  }
                                }}
                              >
                                Thêm
                              </button>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Hình thức học</label>
                            <select
                              className="form-control"
                              value={newLessonForm.learningFormat}
                              onChange={e => setNewLessonForm({ ...newLessonForm, learningFormat: e.target.value })}
                            >
                              <option value="Offline">Offline (Trực tiếp)</option>
                              <option value="Online">Online (Trực tuyến)</option>
                            </select>
                          </div>
                        </div>
                        
                        <div style={{ marginTop: 4 }}>
                          <label className="form-label" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Danh sách ngày đã chọn ({selectedDates.length}):</label>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                            {selectedDates.map(d => (
                              <span key={d} className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', fontSize: '0.7rem' }}>
                                {d.split('-').reverse().join('/')}
                                <span 
                                  style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                                  onClick={() => setSelectedDates(prev => prev.filter(item => item !== d))}
                                >
                                  &times;
                                </span>
                              </span>
                            ))}
                            {selectedDates.length === 0 && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa chọn ngày nào. Vui lòng chọn ngày phía trên và bấm "Thêm".</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {schedulingMode === 'recurring' && (
                      <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 16 }}>
                        <div className="form-group">
                          <label className="form-label">Lặp lại vào các thứ trong tuần *</label>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                            {[
                              { label: 'Thứ 2', val: 1 },
                              { label: 'Thứ 3', val: 2 },
                              { label: 'Thứ 4', val: 3 },
                              { label: 'Thứ 5', val: 4 },
                              { label: 'Thứ 6', val: 5 },
                              { label: 'Thứ 7', val: 6 },
                              { label: 'Chủ Nhật', val: 0 }
                            ].map(day => {
                              const isSelected = recurringDays.includes(day.val);
                              return (
                                <button
                                  key={day.val}
                                  type="button"
                                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline'}`}
                                  style={{ flex: 1, minWidth: '55px', height: '30px', padding: '0 4px', borderRadius: '6px' }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setRecurringDays(prev => prev.filter(v => v !== day.val));
                                    } else {
                                      setRecurringDays(prev => [...prev, day.val]);
                                    }
                                  }}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid-2">
                          <div className="form-group">
                            <label className="form-label">Từ ngày *</label>
                            <input
                              type="date"
                              className="form-control"
                              value={startDate}
                              onChange={e => setStartDate(e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Đến ngày *</label>
                            <input
                              type="date"
                              className="form-control"
                              value={endDate}
                              onChange={e => setEndDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Hình thức học</label>
                          <select
                            className="form-control"
                            value={newLessonForm.learningFormat}
                            onChange={e => setNewLessonForm({ ...newLessonForm, learningFormat: e.target.value })}
                          >
                            <option value="Offline">Offline (Trực tiếp)</option>
                            <option value="Online">Online (Trực tuyến)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">Địa chỉ / Link học buổi này *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Link Meet hoặc Địa chỉ nhà..."
                        value={newLessonForm.address}
                        onChange={e => setNewLessonForm({ ...newLessonForm, address: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ghi chú bài dạy</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Nội dung chuẩn bị..."
                        value={newLessonForm.note}
                        onChange={e => setNewLessonForm({ ...newLessonForm, note: e.target.value })}
                      ></textarea>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Hủy</button>
                {activeTutorStudents.length > 0 && (
                  <button type="submit" className="btn btn-primary">Xác nhận lên lịch</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL / EDIT / ATTENDANCE ================= */}
      {showDetailModal && selectedLesson && (
        (() => {
          const student = students.find(s => s.id === selectedLesson.studentId);
          const subject = student ? subjects.find(sub => sub.id === student.subjectId) : null;
          const tutor = tutors.find(t => t.id === selectedLesson.tutorId);

          // Check conflict
          const conflict = checkLessonConflicts(
            {
              id: selectedLesson.id,
              tutorId: selectedLesson.tutorId,
              studentId: selectedLesson.studentId,
              dateTime: `${editLessonForm.date}T${editLessonForm.time}`,
              endTime: editLessonForm.endTime
            },
            lessons,
            students
          );

          return (
            <div className="modal-overlay" {...handleBackdropClick(() => setShowDetailModal(false))}>
              <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                <div className="modal-header">
                  <h3 className="modal-title">Chi tiết & Cập nhật Lịch dạy</h3>
                  <button className="modal-close" onClick={() => setShowDetailModal(false)}>&times;</button>
                </div>
                <form onSubmit={handleEditSubmit}>
                  <div className="modal-body">

                    {/* Conflict Alert Banner */}
                    {conflict.hasConflict && (
                      <div className={`conflict-warning-banner conflict-${conflict.type}`} style={{
                        backgroundColor: conflict.type === 'overlap' ? 'var(--danger-light)' : 'var(--warning-light)',
                        borderColor: conflict.type === 'overlap' ? 'var(--danger)' : 'var(--warning)',
                        color: conflict.type === 'overlap' ? 'var(--danger-hover)' : 'var(--warning-hover)',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '1px solid',
                        lineHeight: '1.4'
                      }}>
                        <span style={{ fontSize: '1.25rem' }}>{conflict.type === 'overlap' ? '🚨' : '⚠️'}</span>
                        <div>
                          <strong>{conflict.type === 'overlap' ? 'Trùng lịch dạy:' : 'Sát giờ dạy:'}</strong> {conflict.message}. Hãy cân nhắc điều chỉnh lại thời gian học.
                        </div>
                      </div>
                    )}

                    {/* Student Info Details */}
                    <div className="student-info-panel" style={{ marginBottom: 16, padding: 12 }}>
                      <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px 16px' }}>
                        <div className="detail-item">
                          <span className="detail-label">Học viên</span>
                          <span className="detail-value">{student ? student.name : 'Chưa rõ'} (Mã: {selectedLesson.studentId})</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Số điện thoại</span>
                          <span className="detail-value">{student ? student.phone : 'Chưa rõ'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Môn học</span>
                          <span className="detail-value">{subject ? `${subject.id} - ${subject.name}` : 'Chưa rõ'}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Gia sư phụ trách</span>
                          <span className="detail-value">{tutor ? tutor.name : 'Chưa rõ'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Ngày học *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={editLessonForm.date}
                          onChange={e => setEditLessonForm({ ...editLessonForm, date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Hình thức học</label>
                        <select
                          className="form-control"
                          value={editLessonForm.learningFormat}
                          onChange={e => setEditLessonForm({ ...editLessonForm, learningFormat: e.target.value })}
                        >
                          <option value="Offline">Offline (Trực tiếp)</option>
                          <option value="Online">Online (Trực tuyến)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Giờ bắt đầu *</label>
                        <input
                          type="time"
                          className="form-control"
                          value={editLessonForm.time}
                          onChange={e => setEditLessonForm({ ...editLessonForm, time: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Giờ kết thúc *</label>
                        <input
                          type="time"
                          className="form-control"
                          value={editLessonForm.endTime}
                          onChange={e => setEditLessonForm({ ...editLessonForm, endTime: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Địa chỉ học / Link Google Meet *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editLessonForm.address}
                        onChange={e => setEditLessonForm({ ...editLessonForm, address: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Trạng thái buổi học (Điểm danh)</label>
                        <select
                          className="form-control"
                          value={editLessonForm.status}
                          onChange={e => setEditLessonForm({ ...editLessonForm, status: e.target.value })}
                        >
                          <option value="Chưa diễn ra">Chưa diễn ra / Sắp học</option>
                          <option value="Có học">Có học (Hoàn thành dạy)</option>
                          <option value="Vắng học / Hủy buổi">Vắng học / Hủy buổi</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ghi chú buổi học / Nhận xét tiến độ</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        value={editLessonForm.note}
                        onChange={e => setEditLessonForm({ ...editLessonForm, note: e.target.value })}
                      ></textarea>
                    </div>

                  </div>
                  <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <button type="button" className="btn btn-danger" onClick={handleDeleteLesson}>Xóa lịch dạy này</button>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="button" className="btn btn-outline" onClick={() => setShowDetailModal(false)}>Hủy</button>
                      <button type="submit" className="btn btn-primary">Lưu thay đổi</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          );
        })()
      )}

      <style>{`
        .calendar-page-container {
          display: flex;
          flex-direction: column;
          height: auto;
          min-height: calc(100vh - 120px);
        }

        .calendar-nav-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .current-month-label {
          font-weight: 700;
          font-size: 1.05rem;
          min-width: 140px;
          text-align: center;
        }

        .student-info-panel {
          background-color: var(--bg-primary);
          padding: 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }

        .location-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meet-link-box {
          display: flex;
          flex-direction: column;
          gap: 4px;
          background-color: var(--bg-secondary);
          padding: 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .meet-url {
          font-family: monospace;
          color: var(--text-secondary);
          font-size: 0.8rem;
          word-break: break-all;
        }

        /* Selected Calendar Cell */
        .calendar-cell.selected {
          border: 2px solid var(--primary) !important;
          background-color: var(--primary-light) !important;
        }

        /* Pulsing style for completely overlapping events (Red/Danger) */
        .calendar-event-pill.conflict-overlap {
          background-color: #fef2f2 !important;
          border: 1.5px solid #ef4444 !important;
          color: #991b1b !important;
          border-left: 4px solid #ef4444 !important;
          animation: pulse-overlap 2s infinite;
        }

        /* Pulsing style for consecutive/close events (Orange/Warning) */
        .calendar-event-pill.conflict-consecutive {
          background-color: #fffbeb !important;
          border: 1.5px solid #f59e0b !important;
          color: #b45309 !important;
          border-left: 4px solid #f59e0b !important;
          animation: pulse-consecutive 2s infinite;
        }

        @keyframes pulse-overlap {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        @keyframes pulse-consecutive {
          0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          70% { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }

        /* Conflict Banner Alert */
        .conflict-warning-banner {
          background-color: #fffbeb;
          border: 1px solid #fde68a;
          color: #b45309;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          line-height: 1.4;
        }

        /* Mobile Selected Date Schedule Styling */
        .mobile-lessons-container {
          display: none;
        }

        @media (max-width: 768px) {
          .calendar-page-container {
            height: auto;
          }

          .calendar-cell {
            min-height: 52px;
            height: 52px;
            padding: 4px;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          }

          .calendar-date {
            margin-bottom: 0;
            width: 20px;
            height: 20px;
            font-size: 0.75rem;
          }

          .calendar-events {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 3px;
            justify-content: center;
            align-items: center;
            margin-top: 4px;
            height: 12px;
            overflow: hidden;
          }

          /* Render small event dots on mobile grid */
          .calendar-event-pill {
            width: 6px;
            height: 6px;
            border-radius: 50% !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 0 !important;
            border-left: none !important;
            min-width: 6px;
            min-height: 6px;
            display: block;
          }

          .calendar-event-pill.scheduled { background-color: var(--primary) !important; }
          .calendar-event-pill.attended { background-color: var(--success) !important; }
          .calendar-event-pill.absent { background-color: var(--danger) !important; }

          /* Mobile lessons details list */
          .mobile-lessons-container {
            display: block;
            margin-top: 24px;
            border-top: 1px solid var(--border-color);
            padding-top: 20px;
          }

          .mobile-lessons-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .mobile-lessons-title {
            font-size: 0.9rem;
            font-weight: 800;
            color: var(--text-primary);
          }

          .mobile-lessons-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .mobile-no-lessons {
            text-align: center;
            padding: 24px;
            background-color: var(--bg-secondary);
            border-radius: var(--radius-md);
            border: 1px dashed var(--border-color);
            color: var(--text-secondary);
            font-size: 0.76rem;
            line-height: 1.4;
          }

          .mobile-lesson-card {
            background-color: var(--bg-secondary);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            padding: 12px;
            transition: var(--transition);
            cursor: pointer;
            border-left: 4px solid var(--primary);
          }

          .mobile-lesson-card.attended {
            border-left-color: var(--success);
          }

          .mobile-lesson-card.absent {
            border-left-color: var(--danger);
          }

          .mobile-lesson-card:hover {
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
          }

          .mobile-lesson-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 0.76rem;
          }

          .mobile-lesson-card-header .time {
            font-weight: 700;
            color: var(--text-primary);
          }

          .mobile-lesson-card-body {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 0.72rem;
            color: var(--text-secondary);
          }

          .mobile-lesson-card-body .detail-row {
            display: flex;
            gap: 6px;
            line-height: 1.4;
          }

          .mobile-lesson-card-body .detail-row .label {
            color: var(--text-muted);
            min-width: 65px;
            flex-shrink: 0;
          }

          .mobile-lesson-card-body .detail-row .value {
            color: var(--text-primary);
          }

          .mobile-conflict-alert {
            margin-top: 8px;
            padding: 6px 10px;
            background-color: var(--warning-light);
            border-radius: 4px;
            color: var(--warning-hover);
            border: 1px solid rgba(245, 158, 11, 0.2);
            font-weight: 500;
          }
        }
      `}</style>
      {/* ================= CONFIRM DELETE MODAL ================= */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa buổi học"
        message="Bạn có chắc chắn muốn xóa buổi học này khỏi lịch biểu? Hành động này sẽ tự động cập nhật lại số buổi học của học sinh!"
        confirmText="Xóa buổi học"
        cancelText="Hủy"
        type="danger"
      />
    </div>
  );
};

export default CalendarView;
