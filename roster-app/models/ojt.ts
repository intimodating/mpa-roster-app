import mongoose from "mongoose";

const ojtSchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  console: { type: String, required: true },
  shift_number: { type: Number, required: true, default: 0 },
}, {
  collection: 'OJT'
});

// Compound index to ensure uniqueness per user per console
ojtSchema.index({ user_id: 1, console: 1 }, { unique: true });

export default mongoose.models.OJT || mongoose.model("OJT", ojtSchema, "OJT");
