"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var userSchema = new mongoose_1.default.Schema({
    user_id: { type: String, required: true, unique: true }, // user_id
    password: { type: String, required: true }, // plain text for now
    account_type: { type: String, enum: ['Planner', 'Non-Planner'], required: true },
    proficiency_grade: { type: Number, required: true },
    name: String,
    email: String,
    age: Number,
    hobbies: [String],
}, {
    collection: 'Users' // <-- Add this line to specify the exact collection name
});
var modelName = 'User'; // <-- Define the exact string name for the model
var User = mongoose_1.default.models[modelName] || mongoose_1.default.model(modelName, userSchema);
exports.default = User;
