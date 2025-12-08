import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },       // user_id
  password: { type: String, required: true },               // plain text for now
  account_type: { type: String, enum: ['Planner', 'Non-Planner'], required: true },
  proficiency_grade: { type: Number, required: true },
  name: String,
  email: String,
  age: Number,
  hobbies: [String],
  reserve_deploy_count: { type: Number, required: true, default: 0 },
}, {
  collection: 'Users' // <-- Add this line to specify the exact collection name
});

const modelName = 'User'; // <-- Define the exact string name for the model

export default mongoose.models.User || mongoose.model("User", userSchema, "Users");