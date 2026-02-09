
import mongoose from "mongoose";

const ApprovedBlockLeaveSchema = new mongoose.Schema({
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
        enum: ["block", "advance"],
        required: true,
    },
    sub_leave_type: {
        type: String,
    },
}, {
    collection: 'Approved_Block_Leaves',
    timestamps: true
});

const modelName = 'Approved_Block_Leave';
const Approved_Block_Leave = mongoose.models[modelName] || mongoose.model(modelName, ApprovedBlockLeaveSchema);

export default Approved_Block_Leave;
