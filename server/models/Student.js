import mongoose from 'mongoose';

const StudentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  age: { type: Number },
  subjectId: { type: String },
  expectedSessions: { type: Number, default: 24 },
  completedSessions: { type: Number, default: 0 },
  remainingSessions: { type: Number, default: 24 },
  learningFormat: { type: String, default: 'Offline' },
  address: { type: String },
  tutorId: { type: String },
  referralId: { type: String },
  totalTuition: { type: Number, default: 3000000 },
  paidTuition: { type: Number, default: 0 },
  debtTuition: { type: Number, default: 3000000 },
  status: { type: String, default: 'Đang học' },
  registerDate: { type: String },
  notes: { type: String, default: '' }
});

export default mongoose.model('Student', StudentSchema);
