import mongoose from 'mongoose';

const TutorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  status: { type: String, default: 'Chưa có lớp' },
  subjects: [{ type: String }],
  isPayable: { type: Boolean, default: true }
});

export default mongoose.model('Tutor', TutorSchema);
