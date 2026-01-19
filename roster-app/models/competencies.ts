import mongoose from "mongoose";

const competencySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  console: { type: String, required: true }, // e.g., "East Control", "VTIS West"
  grade: { type: Number, required: true },    // e.g., proficiency grade required for this competency
  date_achieved: { type: Date, required: true },
}, {
  collection: 'Competencies' // Specify the exact collection name
});

const modelName = 'Competency';

export default mongoose.models.Competency || mongoose.model("Competency", competencySchema, "Competencies");
