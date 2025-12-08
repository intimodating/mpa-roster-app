"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
exports.connectToDatabase = connectToDatabase;
// lib/mongoose-client.ts
const mongoose_1 = __importDefault(require("mongoose"));
// --- Connection Logic ---
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    throw new Error("Please define MONGODB_URI in .env.local");
}
async function connectToDatabase() {
    console.log("⏳ Creating new MongoDB connection (from mongoose-client)...");
    try {
        const connection = await mongoose_1.default.connect(MONGO_URI);
        console.log("✅ New MongoDB connection established (from mongoose-client)");
        return connection;
    }
    catch (_e) {
        console.error("❌ MongoDB connection error:", _e);
        throw _e;
    }
}
// --- User Schema and Model Logic ---
const userSchema = new mongoose_1.default.Schema({
    user_id: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    account_type: { type: String, enum: ['Planner', 'Non-Planner'], required: true },
    proficiency_grade: { type: Number, required: true },
    name: String,
    email: String,
    age: Number,
    hobbies: [String],
    reserve_deploy_count: { type: Number, required: true, default: 0 },
}, {
    collection: 'Users'
});
// Ensure the model is only defined once
let User;
try {
    exports.User = User = mongoose_1.default.model('User');
}
catch (error) {
    exports.User = User = mongoose_1.default.model('User', userSchema, 'Users');
}
