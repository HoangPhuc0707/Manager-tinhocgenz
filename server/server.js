/* global process */
/* eslint-disable no-unused-vars */
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Import Models
import Subject from './models/Subject.js';
import Referral from './models/Referral.js';
import Tutor from './models/Tutor.js';
import Student from './models/Student.js';
import Receipt from './models/Receipt.js';
import Payout from './models/Payout.js';
import Lesson from './models/Lesson.js';
import Account from './models/Account.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support base64 image proofs

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined! Please check your server/.env file.');
}

// Mock database fallbacks to seed database if empty
const MOCK_SUBJECTS = [
  { id: 'MH_PY01', name: 'Lập trình Python Cơ Bản', category: 'Lập trình', tuition: 3000000 },
  { id: 'MH_CPP01', name: 'Lập trình C++ Luyện Thi', category: 'Lập trình', tuition: 3600000 },
  { id: 'MH_SCR01', name: 'Lập trình Scratch Thiếu Nhi', category: 'Lập trình', tuition: 2400000 },
  { id: 'MH_OFC01', name: 'Tin học văn phòng Word/Excel', category: 'Văn phòng', tuition: 2000000 },
  { id: 'MH_MOS01', name: 'Luyện thi chứng chỉ MOS', category: 'Chứng chỉ', tuition: 2800000 }
];

const MOCK_REFERRALS = [
  { id: 'NG001', name: 'Facebook Ads', details: 'Chiến dịch quảng cáo hè 2026', isPayable: false },
  { id: 'NG002', name: 'Thầy Bình Tin Học', details: 'Giáo viên THPT Phan Đình Phùng (SĐT: 0905123456)', isPayable: true },
  { id: 'NG003', name: 'Tìm kiếm Google', details: 'Tìm kiếm tự nhiên từ Website trung tâm', isPayable: false }
];

const MOCK_TUTORS = [
  { id: 'GS001', name: 'Nguyễn Văn A', phone: '0912345678', email: 'tutor.a@gmail.com', address: 'Cầu Giấy, Hà Nội', status: 'Đang dạy', subjects: ['MH_PY01', 'MH_CPP01'], isPayable: true },
  { id: 'GS002', name: 'Trần Thị C', phone: '0987654321', email: 'tutor.c@gmail.com', address: 'Đống Đa, Hà Nội', status: 'Chưa có lớp', subjects: ['MH_OFC01', 'MH_MOS01'], isPayable: true },
  { id: 'GS003', name: 'Phạm Minh Đức', phone: '0904445556', email: 'duc.pm@gmail.com', address: 'Thanh Xuân, Hà Nội', status: 'Đang dạy', subjects: ['MH_SCR01', 'MH_PY01'], isPayable: true }
];

const MOCK_STUDENTS = [
  { id: 'HV001', name: 'Trần Thị B', phone: '0987654321', age: 15, subjectId: 'MH_PY01', expectedSessions: 24, completedSessions: 1, remainingSessions: 23, learningFormat: 'Offline', address: '456 Nguyễn Trãi, Thanh Xuân, Hà Nội', tutorId: 'GS001', referralId: 'NG002', totalTuition: 3000000, paidTuition: 1500000, debtTuition: 1500000, status: 'Đang học', registerDate: '01/06/2026', notes: 'Học viên chăm chỉ, cần thực hành nhiều về vòng lặp' },
  { id: 'HV002', name: 'Lê Hoàng Long', phone: '0911223344', age: 10, subjectId: 'MH_SCR01', expectedSessions: 20, completedSessions: 2, remainingSessions: 18, learningFormat: 'Online', address: 'meet.google.com/abc-xyz', tutorId: 'GS003', referralId: 'NG001', totalTuition: 2400000, paidTuition: 2400000, debtTuition: 0, status: 'Đang học', registerDate: '25/05/2026', notes: 'Ưa thích làm game hoạt hình' },
  { id: 'HV003', name: 'Nguyễn Hà Anh', phone: '0933445566', age: 20, subjectId: 'MH_OFC01', expectedSessions: 12, completedSessions: 12, remainingSessions: 0, learningFormat: 'Online', address: 'meet.google.com/def-uvw', tutorId: 'GS002', referralId: 'NG003', totalTuition: 2000000, paidTuition: 2000000, debtTuition: 0, status: 'Đã tốt nghiệp', registerDate: '15/04/2026', notes: 'Đã hoàn thành khóa học xuất sắc' }
];

const MOCK_RECEIPTS = [
  { id: 'BL001', studentId: 'HV001', amount: 1500000, date: '01/06/2026', method: 'Chuyển khoản', note: 'Đóng học phí đợt 1' },
  { id: 'BL002', studentId: 'HV002', amount: 2400000, date: '25/05/2026', method: 'Chuyển khoản', note: 'Đóng học phí trọn gói' },
  { id: 'BL003', studentId: 'HV003', amount: 2000000, date: '15/04/2026', method: 'Chuyển khoản', note: 'Đóng học phí trọn gói' }
];

const MOCK_PAYOUTS = [
  { id: 'PC001', type: 'Gia sư', recipientId: 'GS003', studentId: 'HV002', amount: 1200000, status: 'Đã thanh toán', date: '30/05/2026', method: 'Chuyển khoản', note: 'Thanh toán lương khóa Scratch' },
  { id: 'PC002', type: 'Nguồn giới thiệu', recipientId: 'NG002', studentId: 'HV001', amount: 100000, status: 'Đã thanh toán', date: '02/06/2026', method: 'Chuyển khoản', note: 'Hoa hồng giới thiệu HV001' },
  { id: 'PC003', type: 'Gia sư', recipientId: 'GS001', studentId: 'HV001', amount: 1500000, status: 'Chưa thanh toán', date: '', method: '', note: 'Lương đợt 1 lớp Python' }
];

const MOCK_LESSONS = [
  { id: 'LH0001', tutorId: 'GS003', studentId: 'HV002', dateTime: '2026-05-28T18:00', endTime: '20:00', status: 'Có học', note: 'Làm quen Scratch, lập trình trò chơi di chuyển', learningFormat: 'Online', address: 'meet.google.com/abc-xyz' },
  { id: 'LH0002', tutorId: 'GS003', studentId: 'HV002', dateTime: '2026-05-30T18:00', endTime: '20:00', status: 'Có học', note: 'Lập trình nhân vật nhảy tránh vật cản', learningFormat: 'Online', address: 'meet.google.com/abc-xyz' },
  { id: 'LH0003', tutorId: 'GS001', studentId: 'HV001', dateTime: '2026-06-02T19:30', endTime: '21:00', status: 'Có học', note: 'Biến số và kiểu dữ liệu trong Python', learningFormat: 'Offline', address: '456 Nguyễn Trãi, Thanh Xuân, Hà Nội' },
  { id: 'LH0004', tutorId: 'GS001', studentId: 'HV001', dateTime: '2026-06-04T19:30', endTime: '21:00', status: 'Chưa diễn ra', note: 'Cấu trúc điều kiện If Else', learningFormat: 'Offline', address: '456 Nguyễn Trãi, Thanh Xuân, Hà Nội' }
];

const MOCK_ACCOUNTS = [
  { username: 'admin', password: '123', role: 'Admin', linkId: '' },
  { username: 'tutor.a@gmail.com', password: '123', role: 'Gia sư', linkId: 'GS001' },
  { username: 'tutor.c@gmail.com', password: '123', role: 'Gia sư', linkId: 'GS002' },
  { username: 'duc.pm@gmail.com', password: '123', role: 'Gia sư', linkId: 'GS003' }
];

// Helper to recalculate a specific student's calculated fields
const recalculateStudent = async (studentId) => {
  const student = await Student.findOne({ id: studentId });
  if (!student) return;

  const studentReceipts = await Receipt.find({ studentId });
  const paidTuition = studentReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
  let debtTuition = Math.max(0, Number(student.totalTuition) - paidTuition);
  if (student.status === 'Huỷ khoá') {
    debtTuition = 0;
  }

  const studentLessons = await Lesson.find({ studentId, status: 'Có học' });
  const completedSessions = studentLessons.length;
  const remainingSessions = Math.max(0, Number(student.expectedSessions) - completedSessions);

  student.paidTuition = paidTuition;
  student.debtTuition = debtTuition;
  student.completedSessions = completedSessions;
  student.remainingSessions = remainingSessions;

  await student.save();
};

const recalculateAllStudents = async () => {
  const students = await Student.find();
  await Promise.all(students.map(s => recalculateStudent(s.id)));
};

// Connect to MongoDB & Seed Data
mongoose.connect(MONGODB_URI, { family: 4 })
  .then(async () => {
    console.log('Connected to MongoDB Atlas successfully.');
    
    // Ensure at least one Admin account exists so the user can log in
    const adminCount = await Account.countDocuments({ role: 'Admin' });
    if (adminCount === 0) {
      await new Account({
        username: 'admin',
        password: '123',
        role: 'Admin',
        linkId: ''
      }).save();
      console.log('Default admin account created: admin / 123');
    }
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB Atlas:', err);
  });

// --- API ENDPOINTS ---

// Auth login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const account = await Account.findOne({ username, password });
    if (account) {
      return res.json({
        success: true,
        user: {
          username: account.username,
          role: account.role,
          linkId: account.linkId
        }
      });
    }
    return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recalculate helper route
app.post('/api/students/recalculate', async (req, res) => {
  try {
    await recalculateAllStudents();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subjects CRUD
app.get('/api/subjects', async (req, res) => {
  try { res.json(await Subject.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/subjects', async (req, res) => {
  try {
    const id = 'MH_' + Date.now().toString().slice(-6);
    const item = new Subject({ ...req.body, id });
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/subjects/:id', async (req, res) => {
  try {
    const item = await Subject.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    await Subject.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Referrals CRUD
app.get('/api/referrals', async (req, res) => {
  try { res.json(await Referral.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/referrals', async (req, res) => {
  try {
    const id = 'NG' + Date.now().toString().slice(-3);
    const item = new Referral({ ...req.body, id });
    await item.save();
    res.status(201).json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/referrals/:id', async (req, res) => {
  try {
    const item = await Referral.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/referrals/:id', async (req, res) => {
  try {
    await Referral.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tutors CRUD
app.get('/api/tutors', async (req, res) => {
  try { res.json(await Tutor.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/tutors', async (req, res) => {
  try {
    const id = 'GS' + Date.now().toString().slice(-3);
    const tutor = new Tutor({ ...req.body, id });
    await tutor.save();

    // Auto-generate account for this tutor
    const username = tutor.email || `giasu${id}@giasutinhoc.com`;
    const account = new Account({
      username,
      password: '123',
      role: 'Gia sư',
      linkId: id
    });
    await account.save();

    res.status(201).json(tutor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/tutors/:id', async (req, res) => {
  try {
    const tutor = await Tutor.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(tutor);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/tutors/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Tutor.findOneAndDelete({ id });
    await Account.findOneAndDelete({ linkId: id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Students CRUD
app.get('/api/students', async (req, res) => {
  try {
    res.json(await Student.find().sort({ _id: -1 }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/students', async (req, res) => {
  try {
    const id = 'HV' + Date.now().toString().slice(-3);
    const student = new Student({
      ...req.body,
      id,
      completedSessions: 0,
      remainingSessions: Number(req.body.expectedSessions || 0),
      paidTuition: 0,
      debtTuition: Number(req.body.totalTuition || 0)
    });
    await student.save();
    await recalculateStudent(id);
    const reloaded = await Student.findOne({ id });
    res.status(201).json(reloaded);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/students/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Student.findOneAndUpdate({ id }, req.body);
    await recalculateStudent(id);
    const reloaded = await Student.findOne({ id });
    res.json(reloaded);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/students/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Student.findOneAndDelete({ id });
    await Receipt.deleteMany({ studentId: id });
    await Lesson.deleteMany({ studentId: id });
    await Payout.deleteMany({ studentId: id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Receipts CRUD
app.get('/api/receipts', async (req, res) => {
  try { res.json(await Receipt.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/receipts', async (req, res) => {
  try {
    const id = 'BL' + Date.now().toString().slice(-4);
    const receipt = new Receipt({ ...req.body, id });
    await receipt.save();
    await recalculateStudent(receipt.studentId);
    res.status(201).json(receipt);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const receipt = await Receipt.findOne({ id });
    if (receipt) {
      const studentId = receipt.studentId;
      await Receipt.findOneAndDelete({ id });
      await recalculateStudent(studentId);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Payouts CRUD
app.get('/api/payouts', async (req, res) => {
  try { res.json(await Payout.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
// Payout validate helper API
app.get('/api/payouts/validate/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const amount = Number(req.query.amount || 0);
    const excludePayoutId = req.query.excludePayoutId || '';

    const student = await Student.findOne({ id: studentId });
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học viên' });

    const studentPayouts = await Payout.find({ studentId });
    const currentTotalPayouts = studentPayouts
      .filter(p => p.id !== excludePayoutId)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const newTotalPayouts = currentTotalPayouts + amount;
    res.json({
      valid: newTotalPayouts <= Number(student.totalTuition),
      limit: Number(student.totalTuition),
      currentTotal: currentTotalPayouts,
      proposedTotal: newTotalPayouts,
      remaining: Number(student.totalTuition) - currentTotalPayouts
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/payouts', async (req, res) => {
  try {
    const payout = req.body;
    
    // Check validation constraints
    const student = await Student.findOne({ id: payout.studentId });
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học viên' });

    const studentPayouts = await Payout.find({ studentId: payout.studentId });
    const currentTotalPayouts = studentPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const newTotalPayouts = currentTotalPayouts + Number(payout.amount);

    if (newTotalPayouts > Number(student.totalTuition)) {
      return res.status(400).json({
        error: `RÀNG BUỘC CHI: Tổng chi cho học viên này (${newTotalPayouts.toLocaleString()}đ) vượt quá tổng học phí (${student.totalTuition.toLocaleString()}đ). Số tiền chi tối đa còn lại là: ${(student.totalTuition - currentTotalPayouts).toLocaleString()}đ.`
      });
    }

    const id = 'PC' + Date.now().toString().slice(-4);
    const newPayout = new Payout({
      ...payout,
      id,
      status: payout.status || 'Chưa thanh toán',
      date: payout.status === 'Đã thanh toán' ? payout.date : '',
      method: payout.status === 'Đã thanh toán' ? payout.method : ''
    });
    await newPayout.save();
    res.status(201).json(newPayout);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/payouts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const currentPayout = await Payout.findOne({ id });
    if (!currentPayout) return res.status(404).json({ error: 'Không tìm thấy phiếu chi' });

    const updatedData = req.body;
    const studentId = updatedData.studentId !== undefined ? updatedData.studentId : currentPayout.studentId;
    const amount = updatedData.amount !== undefined ? updatedData.amount : currentPayout.amount;

    const student = await Student.findOne({ id: studentId });
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học viên' });

    const studentPayouts = await Payout.find({ studentId });
    const currentTotalPayouts = studentPayouts
      .filter(p => p.id !== id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const newTotalPayouts = currentTotalPayouts + Number(amount);

    if (newTotalPayouts > Number(student.totalTuition)) {
      return res.status(400).json({
        error: `RÀNG BUỘC CHI: Tổng chi cho học viên này (${newTotalPayouts.toLocaleString()}đ) vượt quá tổng học phí (${student.totalTuition.toLocaleString()}đ). Số tiền chi tối đa còn lại là: ${(student.totalTuition - currentTotalPayouts).toLocaleString()}đ.`
      });
    }

    const updatedPayout = await Payout.findOneAndUpdate({ id }, updatedData, { new: true });
    res.json(updatedPayout);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/payouts/:id', async (req, res) => {
  try {
    await Payout.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lessons CRUD
app.get('/api/lessons', async (req, res) => {
  try { res.json(await Lesson.find().sort({ _id: -1 })); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/lessons', async (req, res) => {
  try {
    const lesson = req.body;
    let learningFormat = lesson.learningFormat;
    let address = lesson.address;

    if (!learningFormat || !address) {
      const student = await Student.findOne({ id: lesson.studentId });
      if (student) {
        if (!learningFormat) learningFormat = student.learningFormat;
        if (!address) address = student.address;
      }
    }

    const id = 'LH' + Date.now().toString().slice(-4);
    const newLesson = new Lesson({
      ...lesson,
      id,
      learningFormat: learningFormat || 'Offline',
      address: address || '',
      status: lesson.status || 'Chưa diễn ra'
    });
    await newLesson.save();
    await recalculateStudent(lesson.studentId);
    res.status(201).json(newLesson);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lessons/batch', async (req, res) => {
  try {
    const { lessons } = req.body;
    if (!Array.isArray(lessons) || lessons.length === 0) {
      return res.status(400).json({ error: 'Danh sách buổi học không hợp lệ hoặc rỗng.' });
    }

    const createdLessons = [];
    const studentIdsToRecalculate = new Set();
    const baseTime = Date.now();

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      let learningFormat = lesson.learningFormat;
      let address = lesson.address;

      if (!learningFormat || !address) {
        const student = await Student.findOne({ id: lesson.studentId });
        if (student) {
          if (!learningFormat) learningFormat = student.learningFormat;
          if (!address) address = student.address;
        }
      }

      // Ensure unique ID for each lesson by adding iteration index to baseTime
      const id = 'LH' + (baseTime + i).toString().slice(-5);
      const newLesson = new Lesson({
        ...lesson,
        id,
        learningFormat: learningFormat || 'Offline',
        address: address || '',
        status: lesson.status || 'Chưa diễn ra'
      });
      await newLesson.save();
      createdLessons.push(newLesson);
      studentIdsToRecalculate.add(lesson.studentId);
    }

    // Recalculate each affected student once at the end
    for (const studentId of studentIdsToRecalculate) {
      await recalculateStudent(studentId);
    }

    res.status(201).json(createdLessons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/lessons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const lesson = await Lesson.findOneAndUpdate({ id }, req.body, { new: true });
    if (lesson) {
      await recalculateStudent(lesson.studentId);
    }
    res.json(lesson);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/lessons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const lesson = await Lesson.findOne({ id });
    if (lesson) {
      const studentId = lesson.studentId;
      await Lesson.findOneAndDelete({ id });
      await recalculateStudent(studentId);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Calendar feed for tutors (iPhone/Google Calendar sync)
app.get('/api/calendar/feed/:tutorId.ics', async (req, res) => {
  try {
    const { tutorId } = req.params;

    // Remove the .ics extension if it was passed in the param
    const cleanTutorId = tutorId.replace(/\.ics$/i, '');

    const tutor = await Tutor.findOne({ id: cleanTutorId });
    if (!tutor) {
      return res.status(404).send('Tutor not found');
    }

    const lessons = await Lesson.find({ tutorId: cleanTutorId });
    const studentIds = [...new Set(lessons.map(l => l.studentId))];
    const students = await Student.find({ id: { $in: studentIds } });
    const studentMap = {};
    students.forEach(s => {
      studentMap[s.id] = s;
    });

    const subjects = await Subject.find({});
    const subjectMap = {};
    subjects.forEach(sub => {
      subjectMap[sub.id] = sub;
    });

    const formatICSDate = (dateTimeStr, isEndTime = false, fallbackTime = '21:00') => {
      if (!dateTimeStr) return '';
      const parts = dateTimeStr.split('T');
      const datePart = parts[0];
      let timePart = parts[1];

      if (isEndTime) {
        timePart = fallbackTime;
      }

      const yyyymmdd = datePart.replace(/-/g, '');
      const hhmmss = timePart ? timePart.replace(/:/g, '').slice(0, 4) + '00' : '000000';
      return `${yyyymmdd}T${hhmmss}`;
    };

    const escapeICS = (str) => {
      if (!str) return '';
      return str
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    const foldLine = (line) => {
      if (line.length <= 75) return line;
      const parts = [];
      parts.push(line.substring(0, 75));
      let index = 75;
      while (index < line.length) {
        parts.push(' ' + line.substring(index, index + 74));
        index += 74;
      }
      return parts.join('\r\n');
    };

    const ics = [];
    ics.push('BEGIN:VCALENDAR');
    ics.push('VERSION:2.0');
    ics.push('PRODID:-//Tin Hoc GenZ//Tutor Calendar Feed//VI');
    ics.push('CALSCALE:GREGORIAN');
    ics.push('METHOD:PUBLISH');
    ics.push(`X-WR-CALNAME:Lich day - Gia su ${tutor.name}`);
    ics.push('X-WR-TIMEZONE:Asia/Ho_Chi_Minh');
    ics.push('X-WR-CALDESC:Lich day gia su tu dong dong bo tu Tin Hoc GenZ');

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    for (const lesson of lessons) {
      const student = studentMap[lesson.studentId];
      const subject = student ? subjectMap[student.subjectId] : null;

      const studentName = student ? student.name : lesson.studentId;
      const subjectName = subject ? subject.name : 'Mon hoc';

      const dtstart = formatICSDate(lesson.dateTime);
      const dtend = formatICSDate(lesson.dateTime, true, lesson.endTime || '21:00');

      let location = '';
      if (lesson.learningFormat === 'Online') {
        location = lesson.address || 'Hoc Online';
      } else {
        location = lesson.address || (student ? student.address : 'Hoc Offline');
      }

      let statusLabel = 'Lịch dạy';
      if (lesson.status === 'Có học') statusLabel = 'Đã dạy';
      if (lesson.status === 'Vắng học / Hủy buổi') statusLabel = 'Hủy dạy';

      const descriptionLines = [
        `Học viên: ${studentName}`,
        `Môn học: ${subjectName}`,
        `Hình thức: ${lesson.learningFormat}`,
        `Địa điểm: ${lesson.address || (student ? student.address : 'Chưa cập nhật')}`,
        `Trạng thái: ${lesson.status}`,
        `Ghi chú: ${lesson.note || 'Không có ghi chú'}`
      ];

      const escapedSummary = escapeICS(`[${statusLabel}] ${studentName} - ${subjectName}`);
      const escapedDescription = escapeICS(descriptionLines.join('\n'));
      const escapedLocation = escapeICS(location);

      ics.push('BEGIN:VEVENT');
      ics.push(`UID:lesson_${lesson.id}_${lesson._id || Date.now()}@tinhocgenz.com`);
      ics.push(`DTSTAMP:${nowStr}`);
      ics.push(`DTSTART;TZID=Asia/Ho_Chi_Minh:${dtstart}`);
      ics.push(`DTEND;TZID=Asia/Ho_Chi_Minh:${dtend}`);
      ics.push(`SUMMARY:${escapedSummary}`);
      ics.push(`DESCRIPTION:${escapedDescription}`);
      ics.push(`LOCATION:${escapedLocation}`);
      ics.push('END:VEVENT');
    }

    ics.push('END:VCALENDAR');

    const icsContent = ics.map(foldLine).join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tutor_${cleanTutorId}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(icsContent);
  } catch (err) {
    res.status(500).send(`Error generating calendar feed: ${err.message}`);
  }
});

// --- AI SCHEDULE ASSISTANT ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/ai/schedule-suggest', async (req, res) => {
  try {
    const { message, role, tutorId, conversationHistory = [] } = req.body;

    // --- Thu thập context từ DB dựa trên role ---
    let tutors = [];
    let students = [];
    let lessons = [];
    let subjects = [];

    subjects = await Subject.find();

    if (role === 'Admin') {
      // Admin thấy toàn bộ hệ thống
      tutors = await Tutor.find();
      students = await Student.find();
      // Chỉ lấy lịch trong 4 tuần gần nhất để giảm token
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      lessons = await Lesson.find({ dateTime: { $gte: fourWeeksAgo.toISOString().slice(0, 10) } });
    } else if (role === 'Gia sư' && tutorId) {
      // Gia sư chỉ thấy data của mình
      tutors = await Tutor.find({ id: tutorId });
      students = await Student.find({ tutorId: tutorId });
      const studentIds = students.map(s => s.id);
      lessons = await Lesson.find({ tutorId: tutorId });
    }

    // --- Build context summary cho AI ---
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.id] = s.name; });

    const tutorsSummary = tutors.map(t => ({
      id: t.id,
      name: t.name,
      subjects: t.subjects.map(sid => subjectMap[sid] || sid),
      status: t.status
    }));

    const studentsSummary = students.map(s => ({
      id: s.id,
      name: s.name,
      subject: subjectMap[s.subjectId] || s.subjectId,
      tutorId: s.tutorId,
      tutorName: tutors.find(t => t.id === s.tutorId)?.name || s.tutorId,
      remainingSessions: s.remainingSessions,
      completedSessions: s.completedSessions,
      expectedSessions: s.expectedSessions,
      learningFormat: s.learningFormat,
      address: s.address,
      status: s.status,
      notes: s.notes
    }));

    const lessonsSummary = lessons.map(l => ({
      id: l.id,
      tutorId: l.tutorId,
      studentId: l.studentId,
      dateTime: l.dateTime,
      endTime: l.endTime,
      status: l.status,
      learningFormat: l.learningFormat
    }));

    // --- Lấy ngày hiện tại ---
    const now = new Date();
    const todayVN = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });

    const systemPrompt = `Bạn là trợ lý AI thông minh của trung tâm tin học GenZ, chuyên giúp sắp xếp và gợi ý lịch học cho gia sư và học viên.

Hôm nay là: ${todayVN}
Vai trò người dùng hiện tại: ${role}${role === 'Gia sư' ? ` (ID: ${tutorId})` : ''}

=== DỮ LIỆU HỆ THỐNG ===

DANH SÁCH GIA SƯ:
${JSON.stringify(tutorsSummary, null, 2)}

DANH SÁCH HỌC VIÊN:
${JSON.stringify(studentsSummary, null, 2)}

LỊCH HỌC GẦN ĐÂY:
${JSON.stringify(lessonsSummary, null, 2)}

=== QUY TẮC PHẢN HỒI ===
1. Trả lời bằng tiếng Việt, thân thiện và chuyên nghiệp.
2. Khi gợi ý lịch học, luôn kiểm tra xung đột (cùng gia sư, cùng thời điểm).
3. Nếu gợi ý các buổi học cụ thể, hãy trả về ĐỒNG THỜI một mảng JSON "suggestions" ở cuối phản hồi, theo định dạng:
   |||SUGGESTIONS_JSON|||
   [
     {
       "tutorId": "GS001",
       "tutorName": "Nguyễn Văn A",
       "studentId": "HV001",
       "studentName": "Tên học viên",
       "dateTime": "2026-07-28T18:00",
       "endTime": "20:00",
       "learningFormat": "Offline",
       "address": "địa chỉ học",
       "note": "Nội dung buổi học"
     }
   ]
   |||END_SUGGESTIONS|||
4. Nếu không có gợi ý lịch cụ thể, KHÔNG cần trả về JSON suggestions.
5. ${role === 'Gia sư' ? 'Chú ý: Người dùng là gia sư, chỉ cung cấp thông tin liên quan đến họ và học sinh của họ.' : 'Admin có thể xem và sắp xếp lịch cho tất cả gia sư và học sinh.'}`;

    // Format conversation history for Gemini
    const history = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const rawReply = result.response.text();

    // Parse suggestions từ phản hồi AI nếu có
    let reply = rawReply;
    let suggestions = [];

    const suggestionsMatch = rawReply.match(/\|\|\|SUGGESTIONS_JSON\|\|\|([\s\S]*?)\|\|\|END_SUGGESTIONS\|\|\|/);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1].trim());
        // Xóa phần JSON ra khỏi text hiển thị
        reply = rawReply.replace(/\|\|\|SUGGESTIONS_JSON\|\|\|[\s\S]*?\|\|\|END_SUGGESTIONS\|\|\|/, '').trim();
      } catch (e) {
        console.error('Failed to parse AI suggestions JSON:', e);
      }
    }

    res.json({ reply, suggestions });
  } catch (err) {
    console.error('AI endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server (only if not running on Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
