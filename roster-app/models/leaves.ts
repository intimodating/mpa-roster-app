
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
        enum: ["Annual leave", "Medical leave", "Hospitalisation Leave", "Parental Leave", "Advance Leave", "Block Leave"],
        required: true,
    },
    status: {
        type: String,
        enum: ["Approved", "Rejected", "Pending"],
        default: "Pending",
        required: true,
    },
    sub_leave_type: { // Added to capture sub-type for block/advance leaves
        type: String,
    },
}, {
    collection: 'Leaves',
    timestamps: true
});

const modelName = 'Leave';
const Leave = mongoose.models[modelName] || mongoose.model(modelName, LeaveSchema);

export default Leave;
