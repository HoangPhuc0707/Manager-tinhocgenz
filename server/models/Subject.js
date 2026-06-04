import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  tuition: { type: Number, required: true }
});

export default mongoose.model('Subject', SubjectSchema);
