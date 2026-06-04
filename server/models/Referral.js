import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  details: { type: String }
});

export default mongoose.model('Referral', ReferralSchema);
