
import mongoose from "mongoose";

const PendingBlockLeaveSchema = new mongoose.Schema({
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
    remarks: {
        type: String,
    },
    sub_leave_type: {
        type: String,
    },
    applied_at: {
        type: Date,
        required: true,
    },
}, {
    collection: 'Pending_Block_Leaves',
    timestamps: true
});

const modelName = 'Pending_Block_Leave';
const Pending_Block_Leave = mongoose.models[modelName] || mongoose.model(modelName, PendingBlockLeaveSchema);

export default Pending_Block_Leave;
