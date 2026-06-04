import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tutorId: { type: String, required: true },
  studentId: { type: String, required: true },
  dateTime: { type: String, required: true },
  startTime: { type: String },
  endTime: { type: String },
  status: { type: String, default: 'Chưa diễn ra' },
  note: { type: String },
  learningFormat: { type: String },
  address: { type: String }
});

export default mongoose.model('Lesson', LessonSchema);
