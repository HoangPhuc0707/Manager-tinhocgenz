import mongoose from 'mongoose';

const AccountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  linkId: { type: String, default: '' }
});

export default mongoose.model('Account', AccountSchema);
