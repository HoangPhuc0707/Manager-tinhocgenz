import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  details: { type: String },
  isPayable: { type: Boolean, default: false }
});

export default mongoose.model('Referral', ReferralSchema);
