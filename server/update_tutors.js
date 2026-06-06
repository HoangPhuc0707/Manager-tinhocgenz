/* global process */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('No MONGODB_URI found!');
  process.exit(1);
}

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

const Tutor = mongoose.model('Tutor', TutorSchema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { family: 4 });
    console.log('Connected.');

    // Update all existing tutors to have isPayable: true
    const result = await Tutor.updateMany({ isPayable: { $exists: false } }, { $set: { isPayable: true } });
    console.log('Updated existing tutors without isPayable flag:', result);

    // Make sure GS001, GS002, GS003 are isPayable: true
    await Tutor.updateMany({ id: { $in: ['GS001', 'GS002', 'GS003'] } }, { $set: { isPayable: true } });
    console.log('Explicitly ensured GS001, GS002, GS003 have isPayable: true');

    console.log('Done updating DB!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
