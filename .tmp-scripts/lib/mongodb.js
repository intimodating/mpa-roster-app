"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
// lib/mongodb.ts
const mongoose_1 = __importDefault(require("mongoose"));
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
    throw new Error("Please define MONGODB_URI in .env.local");
}
async function connectToDatabase() {
    console.log("⏳ Creating new MongoDB connection (no caching)...");
    try {
        const connection = await mongoose_1.default.connect(MONGO_URI);
        console.log("✅ New MongoDB connection established (no caching)");
        return connection;
    }
    catch (e) {
        console.error("❌ MongoDB connection error:", e);
        throw e;
    }
}
