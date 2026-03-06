// models/roster.ts
import mongoose from "mongoose";

const RosterSchema = new mongoose.Schema({
    // A reference to the employee assigned to this shift
    user_id: { 
        type: String, 
        required: true,
        // Optional: If you want t                                                    o use Mongoose population, 
        // you would use type: mongoo111se.Schema.Types.ObjectId, ref: 'User'
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

    assigned_console: {
        type: String,
    },

    is_ojt: {
        type: Boolean,
        default: false
    },

    // Optional: Notes or role for that specific shift
    role: String,
}, {
    collection: 'Rosters',
    timestamps: true // Tracks when the assignment was created/updated
});

const modelName = 'Roster';
const Roster = mongoose.models[modelName] || mongoose.model(modelName, RosterSchema);

export default Roster;