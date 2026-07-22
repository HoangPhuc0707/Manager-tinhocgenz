/* global process */
/* eslint-disable no-unused-vars */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './db.js';
import * as schema from './schema.js';
import { eq, desc, inArray } from 'drizzle-orm';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 5000;

// Helper to recalculate a specific student's calculated fields
const recalculateStudent = async (studentId) => {
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
  if (!student) return;

  const studentReceipts = await db.select().from(schema.receipts).where(eq(schema.receipts.studentId, studentId));
  const paidTuition = studentReceipts.reduce((sum, r) => sum + Number(r.amount), 0);
  let debtTuition = Math.max(0, Number(student.totalTuition) - paidTuition);
  if (student.status === 'Huỷ khoá') {
    debtTuition = 0;
  }

  const studentLessons = await db.select().from(schema.lessons).where(
    eq(schema.lessons.studentId, studentId)
  );
  const completedLessons = studentLessons.filter(l => l.status === 'Có học');
  const completedSessions = completedLessons.length;
  const remainingSessions = Math.max(0, Number(student.expectedSessions) - completedSessions);

  await db.update(schema.students)
    .set({
      paidTuition,
      debtTuition,
      completedSessions,
      remainingSessions
    })
    .where(eq(schema.students.id, studentId));
};

const recalculateAllStudents = async () => {
  const allStudents = await db.select().from(schema.students);
  await Promise.all(allStudents.map(s => recalculateStudent(s.id)));
};

// Check default admin account
const initAdmin = async () => {
  const allAdmins = await db.select().from(schema.accounts).where(eq(schema.accounts.role, 'Admin'));
  if (allAdmins.length === 0) {
    await db.insert(schema.accounts).values({
      username: 'admin',
      password: '123',
      role: 'Admin',
      linkId: ''
    });
    console.log('Default admin account created: admin / 123');
  }
};
initAdmin();

// --- API ENDPOINTS ---

// Auth login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.select().from(schema.accounts)
      .where(eq(schema.accounts.username, username));
    
    const account = result.find(a => a.password === password);

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
  try { res.json(await db.select().from(schema.subjects).orderBy(desc(schema.subjects.id))); } 
  catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/subjects', async (req, res) => {
  try {
    const id = 'MH_' + Date.now().toString().slice(-6);
    const data = { ...req.body, id };
    await db.insert(schema.subjects).values(data);
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/subjects/:id', async (req, res) => {
  try {
    await db.update(schema.subjects).set(req.body).where(eq(schema.subjects.id, req.params.id));
    const [item] = await db.select().from(schema.subjects).where(eq(schema.subjects.id, req.params.id));
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/subjects/:id', async (req, res) => {
  try {
    await db.delete(schema.subjects).where(eq(schema.subjects.id, req.params.id));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Referrals CRUD
app.get('/api/referrals', async (req, res) => {
  try { res.json(await db.select().from(schema.referrals).orderBy(desc(schema.referrals.id))); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/referrals', async (req, res) => {
  try {
    const id = 'NG' + Date.now().toString().slice(-3);
    const data = { ...req.body, id };
    await db.insert(schema.referrals).values(data);
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/referrals/:id', async (req, res) => {
  try {
    await db.update(schema.referrals).set(req.body).where(eq(schema.referrals.id, req.params.id));
    const [item] = await db.select().from(schema.referrals).where(eq(schema.referrals.id, req.params.id));
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/referrals/:id', async (req, res) => {
  try {
    await db.delete(schema.referrals).where(eq(schema.referrals.id, req.params.id));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tutors CRUD
app.get('/api/tutors', async (req, res) => {
  try { 
    const tutors = await db.select().from(schema.tutors).orderBy(desc(schema.tutors.id)); 
    const result = tutors.map(t => {
      let parsed = [];
      if (Array.isArray(t.subjects)) parsed = t.subjects;
      else if (typeof t.subjects === 'string') {
        try { parsed = JSON.parse(t.subjects); }
        catch (e) { parsed = t.subjects.split(',').map(s => s.trim()).filter(Boolean); }
      }
      return { ...t, subjects: Array.isArray(parsed) ? parsed : [] };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/tutors', async (req, res) => {
  try {
    const id = 'GS' + Date.now().toString().slice(-3);
    let subs = req.body.subjects || [];
    if (typeof subs === 'string') {
      try { subs = JSON.parse(subs); } catch(e) { subs = subs.split(',').map(s=>s.trim()).filter(Boolean); }
    }
    const data = { ...req.body, id, subjects: Array.isArray(subs) ? subs : [] };
    await db.insert(schema.tutors).values(data);

    const username = data.email || `giasu${id}@giasutinhoc.com`;
    await db.insert(schema.accounts).values({
      username,
      password: '123',
      role: 'Gia sư',
      linkId: id
    });
    
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/tutors/:id', async (req, res) => {
  try {
    let subs = req.body.subjects;
    if (typeof subs === 'string') {
      try { subs = JSON.parse(subs); } catch(e) { subs = subs.split(',').map(s=>s.trim()).filter(Boolean); }
    }
    const data = { ...req.body };
    if (subs !== undefined) data.subjects = Array.isArray(subs) ? subs : [];
    
    await db.update(schema.tutors).set(data).where(eq(schema.tutors.id, req.params.id));
    const [item] = await db.select().from(schema.tutors).where(eq(schema.tutors.id, req.params.id));
    
    let parsed = [];
    if (Array.isArray(item.subjects)) parsed = item.subjects;
    else if (typeof item.subjects === 'string') {
      try { parsed = JSON.parse(item.subjects); }
      catch(e) { parsed = item.subjects.split(',').map(s=>s.trim()).filter(Boolean); }
    }
    item.subjects = Array.isArray(parsed) ? parsed : [];
    res.json(item);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/tutors/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(schema.tutors).where(eq(schema.tutors.id, id));
    await db.delete(schema.accounts).where(eq(schema.accounts.linkId, id));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Students CRUD
app.get('/api/students', async (req, res) => {
  try {
    res.json(await db.select().from(schema.students).orderBy(desc(schema.students.id)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/students', async (req, res) => {
  try {
    const id = 'HV' + Date.now().toString().slice(-3);
    const data = {
      ...req.body,
      id,
      completedSessions: 0,
      remainingSessions: Number(req.body.expectedSessions || 0),
      paidTuition: 0,
      debtTuition: Number(req.body.totalTuition || 0)
    };
    await db.insert(schema.students).values(data);
    await recalculateStudent(id);
    const [reloaded] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    res.status(201).json(reloaded);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/students/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.update(schema.students).set(req.body).where(eq(schema.students.id, id));
    await recalculateStudent(id);
    const [reloaded] = await db.select().from(schema.students).where(eq(schema.students.id, id));
    res.json(reloaded);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/students/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await db.delete(schema.students).where(eq(schema.students.id, id));
    await db.delete(schema.receipts).where(eq(schema.receipts.studentId, id));
    await db.delete(schema.lessons).where(eq(schema.lessons.studentId, id));
    await db.delete(schema.payouts).where(eq(schema.payouts.studentId, id));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Receipts CRUD
app.get('/api/receipts', async (req, res) => {
  try { res.json(await db.select().from(schema.receipts).orderBy(desc(schema.receipts.id))); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/receipts', async (req, res) => {
  try {
    const id = 'BL' + Date.now().toString().slice(-4);
    const data = { ...req.body, id };
    await db.insert(schema.receipts).values(data);
    await recalculateStudent(data.studentId);
    res.status(201).json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/receipts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [receipt] = await db.select().from(schema.receipts).where(eq(schema.receipts.id, id));
    if (receipt) {
      const studentId = receipt.studentId;
      await db.delete(schema.receipts).where(eq(schema.receipts.id, id));
      await recalculateStudent(studentId);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Payouts CRUD
app.get('/api/payouts', async (req, res) => {
  try { res.json(await db.select().from(schema.payouts).orderBy(desc(schema.payouts.id))); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/payouts/validate/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const amount = Number(req.query.amount || 0);
    const excludePayoutId = req.query.excludePayoutId || '';

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học viên' });

    const studentPayouts = await db.select().from(schema.payouts).where(eq(schema.payouts.studentId, studentId));
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
    
    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, payout.studentId));
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học viên' });

    const studentPayouts = await db.select().from(schema.payouts).where(eq(schema.payouts.studentId, payout.studentId));
    const currentTotalPayouts = studentPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
    const newTotalPayouts = currentTotalPayouts + Number(payout.amount);

    if (newTotalPayouts > Number(student.totalTuition)) {
      return res.status(400).json({
        error: `RÀNG BUỘC CHI: Tổng chi cho học viên này (${newTotalPayouts.toLocaleString()}đ) vượt quá tổng học phí (${student.totalTuition.toLocaleString()}đ). Số tiền chi tối đa còn lại là: ${(student.totalTuition - currentTotalPayouts).toLocaleString()}đ.`
      });
    }

    const id = 'PC' + Date.now().toString().slice(-4);
    const newPayout = {
      ...payout,
      id,
      status: payout.status || 'Chưa thanh toán',
      date: payout.status === 'Đã thanh toán' ? payout.date : '',
      method: payout.status === 'Đã thanh toán' ? payout.method : ''
    };
    await db.insert(schema.payouts).values(newPayout);
    res.status(201).json(newPayout);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/payouts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [currentPayout] = await db.select().from(schema.payouts).where(eq(schema.payouts.id, id));
    if (!currentPayout) return res.status(404).json({ error: 'Không tìm thấy phiếu chi' });

    const updatedData = req.body;
    const studentId = updatedData.studentId !== undefined ? updatedData.studentId : currentPayout.studentId;
    const amount = updatedData.amount !== undefined ? updatedData.amount : currentPayout.amount;

    const [student] = await db.select().from(schema.students).where(eq(schema.students.id, studentId));
    if (!student) return res.status(404).json({ error: 'Không tìm thấy học viên' });

    const studentPayouts = await db.select().from(schema.payouts).where(eq(schema.payouts.studentId, studentId));
    const currentTotalPayouts = studentPayouts
      .filter(p => p.id !== id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const newTotalPayouts = currentTotalPayouts + Number(amount);

    if (newTotalPayouts > Number(student.totalTuition)) {
      return res.status(400).json({
        error: `RÀNG BUỘC CHI: Tổng chi cho học viên này (${newTotalPayouts.toLocaleString()}đ) vượt quá tổng học phí (${student.totalTuition.toLocaleString()}đ). Số tiền chi tối đa còn lại là: ${(student.totalTuition - currentTotalPayouts).toLocaleString()}đ.`
      });
    }

    await db.update(schema.payouts).set(updatedData).where(eq(schema.payouts.id, id));
    const [updatedPayout] = await db.select().from(schema.payouts).where(eq(schema.payouts.id, id));
    res.json(updatedPayout);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/payouts/:id', async (req, res) => {
  try {
    await db.delete(schema.payouts).where(eq(schema.payouts.id, req.params.id));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lessons CRUD
app.get('/api/lessons', async (req, res) => {
  try { res.json(await db.select().from(schema.lessons).orderBy(desc(schema.lessons.id))); } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/lessons', async (req, res) => {
  try {
    const lesson = req.body;
    let learningFormat = lesson.learningFormat;
    let address = lesson.address;

    if (!learningFormat || !address) {
      const [student] = await db.select().from(schema.students).where(eq(schema.students.id, lesson.studentId));
      if (student) {
        if (!learningFormat) learningFormat = student.learningFormat;
        if (!address) address = student.address;
      }
    }

    const id = 'LH' + Date.now().toString().slice(-4);
    const newLesson = {
      ...lesson,
      id,
      learningFormat: learningFormat || 'Offline',
      address: address || '',
      status: lesson.status || 'Chưa diễn ra',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.insert(schema.lessons).values(newLesson);
    await recalculateStudent(lesson.studentId);
    res.status(201).json(newLesson);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lessons/batch', async (req, res) => {
  try {
    const { lessons: batchLessons } = req.body;
    if (!Array.isArray(batchLessons) || batchLessons.length === 0) {
      return res.status(400).json({ error: 'Danh sách buổi học không hợp lệ hoặc rỗng.' });
    }

    const createdLessons = [];
    const studentIdsToRecalculate = new Set();
    const baseTime = Date.now();

    for (let i = 0; i < batchLessons.length; i++) {
      const lesson = batchLessons[i];
      let learningFormat = lesson.learningFormat;
      let address = lesson.address;

      if (!learningFormat || !address) {
        const [student] = await db.select().from(schema.students).where(eq(schema.students.id, lesson.studentId));
        if (student) {
          if (!learningFormat) learningFormat = student.learningFormat;
          if (!address) address = student.address;
        }
      }

      const id = 'LH' + (baseTime + i).toString().slice(-5);
      const newLesson = {
        ...lesson,
        id,
        learningFormat: learningFormat || 'Offline',
        address: address || '',
        status: lesson.status || 'Chưa diễn ra',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.insert(schema.lessons).values(newLesson);
      createdLessons.push(newLesson);
      studentIdsToRecalculate.add(lesson.studentId);
    }

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
    const dataToUpdate = { ...req.body, updatedAt: new Date().toISOString() };
    await db.update(schema.lessons).set(dataToUpdate).where(eq(schema.lessons.id, id));
    const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
    if (lesson) {
      await recalculateStudent(lesson.studentId);
    }
    res.json(lesson);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/lessons/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [lesson] = await db.select().from(schema.lessons).where(eq(schema.lessons.id, id));
    if (lesson) {
      const studentId = lesson.studentId;
      await db.delete(schema.lessons).where(eq(schema.lessons.id, id));
      await recalculateStudent(studentId);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Calendar feed for tutors (iPhone/Google Calendar sync)
app.get('/api/calendar/feed/:tutorId.ics', async (req, res) => {
  try {
    const { tutorId } = req.params;
    const cleanTutorId = tutorId.replace(/\.ics$/i, '');

    const [tutor] = await db.select().from(schema.tutors).where(eq(schema.tutors.id, cleanTutorId));
    if (!tutor) {
      return res.status(404).send('Tutor not found');
    }

    const allLessons = await db.select().from(schema.lessons).where(eq(schema.lessons.tutorId, cleanTutorId));
    const studentIds = [...new Set(allLessons.map(l => l.studentId))];
    
    let allStudents = [];
    if (studentIds.length > 0) {
      allStudents = await db.select().from(schema.students).where(inArray(schema.students.id, studentIds));
    }
    
    const studentMap = {};
    allStudents.forEach(s => { studentMap[s.id] = s; });

    const allSubjects = await db.select().from(schema.subjects);
    const subjectMap = {};
    allSubjects.forEach(sub => { subjectMap[sub.id] = sub; });

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
      return str.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n').replace(/\r/g, '');
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
    ics.push('REFRESH-INTERVAL;VALUE=DURATION:PT1H');
    ics.push('X-PUBLISHED-TTL:PT1H');

    const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    for (const lesson of allLessons) {
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

      const updatedAtStr = lesson.updatedAt 
        ? new Date(lesson.updatedAt).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
        : nowStr;
      
      const uidSuffix = ''; 
      
      ics.push('BEGIN:VEVENT');
      ics.push(`UID:lesson_${lesson.id}${uidSuffix}@tinhocgenz.com`);
      ics.push(`DTSTAMP:${updatedAtStr}`);
      ics.push(`LAST-MODIFIED:${updatedAtStr}`);
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

    let allTutors = [];
    let allStudents = [];
    let allLessons = [];
    let allSubjects = await db.select().from(schema.subjects);

    if (role === 'Admin') {
      allTutors = await db.select().from(schema.tutors);
      allStudents = await db.select().from(schema.students);
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const limitDate = fourWeeksAgo.toISOString().slice(0, 10);
      
      const resLessons = await db.select().from(schema.lessons);
      allLessons = resLessons.filter(l => l.dateTime >= limitDate);
    } else if (role === 'Gia sư' && tutorId) {
      allTutors = await db.select().from(schema.tutors).where(eq(schema.tutors.id, tutorId));
      allStudents = await db.select().from(schema.students).where(eq(schema.students.tutorId, tutorId));
      allLessons = await db.select().from(schema.lessons).where(eq(schema.lessons.tutorId, tutorId));
    }

    const subjectMap = {};
    allSubjects.forEach(s => { subjectMap[s.id] = s.name; });

    const tutorsSummary = allTutors.map(t => {
      let parsedSubjects = [];
      if (Array.isArray(t.subjects)) parsedSubjects = t.subjects;
      else if (typeof t.subjects === 'string') {
        try { parsedSubjects = JSON.parse(t.subjects); }
        catch (e) { parsedSubjects = t.subjects.split(',').map(s => s.trim()).filter(Boolean); }
      }
      if (!Array.isArray(parsedSubjects)) parsedSubjects = [];
      
      return {
        id: t.id,
        name: t.name,
        subjects: parsedSubjects.map(sid => subjectMap[sid] || sid),
        status: t.status
      }
    });

    const studentsSummary = allStudents.map(s => ({
      id: s.id,
      name: s.name,
      subject: subjectMap[s.subjectId] || s.subjectId,
      tutorId: s.tutorId,
      tutorName: allTutors.find(t => t.id === s.tutorId)?.name || s.tutorId,
      remainingSessions: s.remainingSessions,
      completedSessions: s.completedSessions,
      expectedSessions: s.expectedSessions,
      learningFormat: s.learningFormat,
      address: s.address,
      status: s.status,
      notes: s.notes
    }));

    const lessonsSummary = allLessons.map(l => ({
      id: l.id,
      tutorId: l.tutorId,
      studentId: l.studentId,
      dateTime: l.dateTime,
      endTime: l.endTime,
      status: l.status,
      learningFormat: l.learningFormat
    }));

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

    let reply = rawReply;
    let suggestions = [];

    const suggestionsMatch = rawReply.match(/\|\|\|SUGGESTIONS_JSON\|\|\|([\s\S]*?)\|\|\|END_SUGGESTIONS\|\|\|/);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1].trim());
        reply = rawReply.replace(/\|\|\|SUGGESTIONS_JSON\|\|\|[\s\S]*?\|\|\|END_SUGGESTIONS\|\|\|/, '').trim();
      } catch (e) {
        console.error("Failed to parse suggestions JSON from AI:", e);
      }
    }

    res.json({ reply, suggestions });

  } catch (error) {
    console.error('AI Suggestion Error:', error);
    res.status(500).json({ error: 'Đã có lỗi xảy ra khi gọi AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
