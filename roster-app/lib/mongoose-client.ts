// lib/mongoose-client.ts
import mongoose, { Document } from "mongoose";

interface UserDocument extends Document {
  user_id: string;
  password?: string; // Password might not always be selected
  account_type: 'Planner' | 'Non-Planner';
  proficiency_grade: number;
  name?: string;
  email?: string;
  age?: number;
  hobbies?: string[];
  reserve_deploy_count: number;
}

// --- Connection Logic ---
const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

export async function connectToDatabase() {
  console.log("⏳ Creating new MongoDB connection (from mongoose-client)...");
  try {
    console.log("Attempting to connect with URI:", MONGO_URI);
    const connection = await mongoose.connect(MONGO_URI!);
    console.log("✅ New MongoDB connection established (from mongoose-client)");
    return connection;
  } catch (_e: unknown) {
    console.error("❌ MongoDB connection error:", _e);
    throw _e;
  }
}

// --- User Schema and Model Logic ---
const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  account_type: { type: String, enum: ['Planner', 'Non-Planner'], required: true },
  proficiency_grade: { type: Number, required: true },
  name: String,
  email: String,
  age: Number,
  hobbies: [String],
  reserve_deploy_count: { type: Number, required: true, default: 0 },
}, {
  collection: 'Users'
});

// Ensure the model is only defined once
let User: mongoose.Model<UserDocument>;
try {
  User = mongoose.model<UserDocument>('User');
} catch (_error) {
  User = mongoose.model<UserDocument>('User', userSchema, 'Users');
}

export { User };
