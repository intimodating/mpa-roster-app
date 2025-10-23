
// models/leaves.ts
import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    leave_type: {
        type: String,
        enum: ["Annual leave", "Medical leave", "Hospitalisation Leave", "Parental Leave"],
        required: true,
    },
}, {
    collection: 'Leaves',
    timestamps: true
});

const modelName = 'Leave';
const Leave = mongoose.models[modelName] || mongoose.model(modelName, LeaveSchema);

export default Leave;
