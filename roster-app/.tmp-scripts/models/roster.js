"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/roster.ts
const mongoose_1 = __importDefault(require("mongoose"));
const RosterSchema = new mongoose_1.default.Schema({
    // A reference to the employee assigned to this shift
    user_id: {
        type: String,
        required: true,
        // Optional: If you want to use Mongoose population, 
        // you would use type: mongoose.Schema.Types.ObjectId, ref: 'User'
    },
    // The date of the shift (stored as a date type for easy querying)
    date: {
        type: Date,
        required: true,
    },
    // The type of shift
    shift_type: {
        type: String,
        enum: ['Morning', 'Afternoon', 'Night', 'Leave'], // Updated shift types
        required: true,
    },
    // The location of the shift
    location: {
        type: String,
        enum: ['East', 'West'],
        required: true,
    },
    // Optional: Notes or role for that specific shift
    role: String,
}, {
    collection: 'Rosters',
    timestamps: true // Tracks when the assignment was created/updated
});
const modelName = 'Roster';
const Roster = mongoose_1.default.models[modelName] || mongoose_1.default.model(modelName, RosterSchema);
exports.default = Roster;
