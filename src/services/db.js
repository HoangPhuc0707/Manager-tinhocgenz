const BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : '/api');

const fetchWithTimeout = async (url, options = {}) => {
  const { timeout = 20000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await window.fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Yêu cầu quá thời gian phản hồi từ máy chủ (Timeout). Vui lòng thử lại!', { cause: error });
    }
    throw error;
  }
};

const fetch = fetchWithTimeout;

// Initialize DB (calls backend recalculation helper to ensure sync on load)
export const initDB = async () => {
  try {
    const res = await fetch(`${BASE_URL}/students/recalculate`, { method: 'POST', timeout: 60000 });
    return await res.json();
  } catch (err) {
    console.error('Failed to init DB (connect backend):', err);
  }
};

// --- SUBJECTS API ---
export const getSubjects = async () => {
  const res = await fetch(`${BASE_URL}/subjects`);
  return await res.json();
};

export const addSubject = async (subject) => {
  const res = await fetch(`${BASE_URL}/subjects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subject)
  });
  return await res.json();
};

export const updateSubject = async (id, updatedData) => {
  const res = await fetch(`${BASE_URL}/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update subject');
  }
  return await res.json();
};

export const deleteSubject = async (id) => {
  const res = await fetch(`${BASE_URL}/subjects/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- REFERRALS API ---
export const getReferrals = async () => {
  const res = await fetch(`${BASE_URL}/referrals`);
  return await res.json();
};

export const addReferral = async (referral) => {
  const res = await fetch(`${BASE_URL}/referrals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(referral)
  });
  return await res.json();
};

export const updateReferral = async (id, updatedData) => {
  const res = await fetch(`${BASE_URL}/referrals/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update referral');
  }
  return await res.json();
};

export const deleteReferral = async (id) => {
  const res = await fetch(`${BASE_URL}/referrals/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- TUTORS API ---
export const getTutors = async () => {
  const res = await fetch(`${BASE_URL}/tutors`);
  return await res.json();
};

export const addTutor = async (tutor) => {
  const res = await fetch(`${BASE_URL}/tutors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tutor)
  });
  return await res.json();
};

export const updateTutor = async (id, updatedData) => {
  const res = await fetch(`${BASE_URL}/tutors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update tutor');
  }
  return await res.json();
};

export const deleteTutor = async (id) => {
  const res = await fetch(`${BASE_URL}/tutors/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- STUDENTS API ---
export const getStudents = async () => {
  const res = await fetch(`${BASE_URL}/students`);
  return await res.json();
};

export const addStudent = async (student) => {
  const res = await fetch(`${BASE_URL}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  });
  return await res.json();
};

export const updateStudent = async (id, updatedData) => {
  const res = await fetch(`${BASE_URL}/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update student');
  }
  return await res.json();
};

export const deleteStudent = async (id) => {
  const res = await fetch(`${BASE_URL}/students/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- RECEIPTS (THU HỌC PHÍ) API ---
export const getReceipts = async () => {
  const res = await fetch(`${BASE_URL}/receipts`);
  return await res.json();
};

export const addReceipt = async (receipt) => {
  const res = await fetch(`${BASE_URL}/receipts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt)
  });
  return await res.json();
};

export const deleteReceipt = async (id) => {
  const res = await fetch(`${BASE_URL}/receipts/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- PAYOUTS (QUẢN LÝ THANH TOÁN CHI) API ---
export const getPayouts = async () => {
  const res = await fetch(`${BASE_URL}/payouts`);
  return await res.json();
};

export const validatePayoutConstraint = async (studentId, amount, excludePayoutId = '') => {
  const res = await fetch(`${BASE_URL}/payouts/validate/${studentId}?amount=${amount}&excludePayoutId=${excludePayoutId}`);
  return await res.json();
};

export const addPayout = async (payout) => {
  const res = await fetch(`${BASE_URL}/payouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payout)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add payout');
  }
  return await res.json();
};

export const updatePayout = async (id, updatedData) => {
  const res = await fetch(`${BASE_URL}/payouts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update payout');
  }
  return await res.json();
};

export const deletePayout = async (id) => {
  const res = await fetch(`${BASE_URL}/payouts/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- LESSONS (LỊCH HỌC & ĐIỂM DANH) API ---
export const getLessons = async () => {
  const res = await fetch(`${BASE_URL}/lessons`);
  return await res.json();
};

export const addLesson = async (lesson) => {
  const res = await fetch(`${BASE_URL}/lessons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(lesson)
  });
  return await res.json();
};

export const updateLesson = async (id, updatedData) => {
  const res = await fetch(`${BASE_URL}/lessons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update lesson');
  }
  return await res.json();
};

export const deleteLesson = async (id) => {
  const res = await fetch(`${BASE_URL}/lessons/${id}`, { method: 'DELETE' });
  return await res.json();
};

// --- AUTHENTICATION API ---
export const login = async (username, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json();
    return { success: false, message: err.error || err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác' };
  }
  return await res.json();
};
