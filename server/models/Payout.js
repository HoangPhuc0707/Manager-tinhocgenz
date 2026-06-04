import mongoose from 'mongoose';

const PayoutSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  recipientId: { type: String, required: true },
  studentId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, default: 'Chưa thanh toán' },
  date: { type: String },
  method: { type: String },
  note: { type: String }
});

export default mongoose.model('Payout', PayoutSchema);
