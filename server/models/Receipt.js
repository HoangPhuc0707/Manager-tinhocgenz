import mongoose from 'mongoose';

const ReceiptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  studentId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  method: { type: String, default: 'Chuyển khoản' },
  note: { type: String },
  proofImg: { type: String }
});

export default mongoose.model('Receipt', ReceiptSchema);
