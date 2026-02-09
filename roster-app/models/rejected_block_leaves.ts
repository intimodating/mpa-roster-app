import mongoose from "mongoose";

const RejectedBlockLeaveSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
    },
    start_date: {
        type: Date,
        required: true,
    },
    end_date: {
        type: Date,
        required: true,
    },
    leave_type: {
        type: String,
        enum: ["block", "advance"],
        required: true,
    },
    sub_leave_type: {
        type: String,
    },
    remarks: {
        type: String,
    },
    applied_at: {
        type: Date,
        required: true,
    },
    rejection_reason: {
        type: String,
        required: true,
    },
    rejected_at: {
        type: Date,
        required: true,
    },
}, {
    collection: 'Rejected_Block_Leaves',
    timestamps: true
});

const modelName = 'Rejected_Block_Leave';
const Rejected_Block_Leave = mongoose.models[modelName] || mongoose.model(modelName, RejectedBlockLeaveSchema);

export default Rejected_Block_Leave;
