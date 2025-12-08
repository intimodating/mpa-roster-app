"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/leaves.ts
const mongoose_1 = __importDefault(require("mongoose"));
const LeaveSchema = new mongoose_1.default.Schema({
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
    status: {
        type: String,
        enum: ["Approved", "Rejected", "Pending"],
        default: "Pending",
        required: true,
    },
}, {
    collection: 'Leaves',
    timestamps: true
});
const modelName = 'Leave';
const Leave = mongoose_1.default.models[modelName] || mongoose_1.default.model(modelName, LeaveSchema);
exports.default = Leave;
