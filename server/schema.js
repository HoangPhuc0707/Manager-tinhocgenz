import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category'),
  tuition: integer('tuition').notNull(),
});

export const referrals = sqliteTable('referrals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  details: text('details'),
  isPayable: integer('isPayable', { mode: 'boolean' }).default(false),
});

export const tutors = sqliteTable('tutors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address'),
  status: text('status').default('Đang dạy'),
  subjects: text('subjects', { mode: 'json' }), 
  isPayable: integer('isPayable', { mode: 'boolean' }).default(true),
});

export const students = sqliteTable('students', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  age: integer('age'),
  subjectId: text('subjectId').notNull(),
  expectedSessions: integer('expectedSessions'),
  completedSessions: integer('completedSessions').default(0),
  remainingSessions: integer('remainingSessions').default(0),
  learningFormat: text('learningFormat'),
  address: text('address'),
  tutorId: text('tutorId'),
  referralId: text('referralId'),
  totalTuition: integer('totalTuition').default(0),
  paidTuition: integer('paidTuition').default(0),
  debtTuition: integer('debtTuition').default(0),
  status: text('status').default('Đang học'),
  registerDate: text('registerDate'),
  notes: text('notes'),
});

export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  studentId: text('studentId').notNull(),
  amount: integer('amount').notNull(),
  date: text('date'),
  method: text('method'),
  note: text('note'),
});

export const payouts = sqliteTable('payouts', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  recipientId: text('recipientId').notNull(),
  studentId: text('studentId').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').default('Chưa thanh toán'),
  date: text('date'),
  method: text('method'),
  note: text('note'),
});

export const lessons = sqliteTable('lessons', {
  id: text('id').primaryKey(),
  tutorId: text('tutorId').notNull(),
  studentId: text('studentId').notNull(),
  dateTime: text('dateTime').notNull(),
  startTime: text('startTime'),
  endTime: text('endTime'),
  status: text('status').default('Chưa diễn ra'),
  note: text('note'),
  learningFormat: text('learningFormat'),
  address: text('address'),
  createdAt: text('createdAt').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updatedAt').default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull(),
  linkId: text('linkId'),
});
