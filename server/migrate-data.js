import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import Subject from './models/Subject.js';
import Referral from './models/Referral.js';
import Tutor from './models/Tutor.js';
import Student from './models/Student.js';
import Receipt from './models/Receipt.js';
import Payout from './models/Payout.js';
import Lesson from './models/Lesson.js';
import Account from './models/Account.js';

import { db } from './db.js';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  try {
    // Migrate Subjects
    const mongoSubjects = await Subject.find().lean();
    if (mongoSubjects.length > 0) {
      await db.insert(schema.subjects).values(mongoSubjects.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category || '',
        tuition: s.tuition || 0
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoSubjects.length} subjects.`);
    }

    // Migrate Referrals
    const mongoReferrals = await Referral.find().lean();
    if (mongoReferrals.length > 0) {
      await db.insert(schema.referrals).values(mongoReferrals.map(r => ({
        id: r.id,
        name: r.name,
        details: r.details || '',
        isPayable: !!r.isPayable
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoReferrals.length} referrals.`);
    }

    // Migrate Tutors
    const mongoTutors = await Tutor.find().lean();
    if (mongoTutors.length > 0) {
      await db.insert(schema.tutors).values(mongoTutors.map(t => ({
        id: t.id,
        name: t.name,
        phone: t.phone,
        email: t.email || '',
        address: t.address || '',
        status: t.status || 'Đang dạy',
        subjects: t.subjects || [], // json
        isPayable: t.isPayable !== undefined ? !!t.isPayable : true
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoTutors.length} tutors.`);
    }

    // Migrate Students
    const mongoStudents = await Student.find().lean();
    if (mongoStudents.length > 0) {
      await db.insert(schema.students).values(mongoStudents.map(s => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        age: s.age || null,
        subjectId: s.subjectId,
        expectedSessions: s.expectedSessions || 0,
        completedSessions: s.completedSessions || 0,
        remainingSessions: s.remainingSessions || 0,
        learningFormat: s.learningFormat || '',
        address: s.address || '',
        tutorId: s.tutorId || '',
        referralId: s.referralId || '',
        totalTuition: s.totalTuition || 0,
        paidTuition: s.paidTuition || 0,
        debtTuition: s.debtTuition || 0,
        status: s.status || 'Đang học',
        registerDate: s.registerDate || '',
        notes: s.notes || ''
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoStudents.length} students.`);
    }

    // Migrate Receipts
    const mongoReceipts = await Receipt.find().lean();
    if (mongoReceipts.length > 0) {
      await db.insert(schema.receipts).values(mongoReceipts.map(r => ({
        id: r.id,
        studentId: r.studentId,
        amount: r.amount,
        date: r.date || '',
        method: r.method || '',
        note: r.note || ''
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoReceipts.length} receipts.`);
    }

    // Migrate Payouts
    const mongoPayouts = await Payout.find().lean();
    if (mongoPayouts.length > 0) {
      await db.insert(schema.payouts).values(mongoPayouts.map(p => ({
        id: p.id,
        type: p.type,
        recipientId: p.recipientId,
        studentId: p.studentId,
        amount: p.amount,
        status: p.status || 'Chưa thanh toán',
        date: p.date || '',
        method: p.method || '',
        note: p.note || ''
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoPayouts.length} payouts.`);
    }

    // Migrate Lessons
    const mongoLessons = await Lesson.find().lean();
    if (mongoLessons.length > 0) {
      await db.insert(schema.lessons).values(mongoLessons.map(l => ({
        id: l.id,
        tutorId: l.tutorId,
        studentId: l.studentId,
        dateTime: l.dateTime,
        startTime: l.startTime || '',
        endTime: l.endTime || '',
        status: l.status || 'Chưa diễn ra',
        note: l.note || '',
        learningFormat: l.learningFormat || '',
        address: l.address || '',
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: l.updatedAt ? new Date(l.updatedAt).toISOString() : new Date().toISOString()
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoLessons.length} lessons.`);
    }

    // Migrate Accounts
    const mongoAccounts = await Account.find().lean();
    if (mongoAccounts.length > 0) {
      await db.insert(schema.accounts).values(mongoAccounts.map(a => ({
        username: a.username,
        password: a.password,
        role: a.role,
        linkId: a.linkId || ''
      }))).onConflictDoNothing();
      console.log(`Migrated ${mongoAccounts.length} accounts.`);
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
