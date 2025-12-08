// lib/mongodb.ts
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  throw new Error("Please define MONGODB_URI in .env.local");
}

export async function connectToDatabase() {
  console.log("⏳ Creating new MongoDB connection (no caching)...");
  try {
    const connection = await mongoose.connect(MONGO_URI!);
    console.log("✅ New MongoDB connection established (no caching)");
    return connection;
  } catch (e) {
    console.error("❌ MongoDB connection error:", e);
    throw e;
  }
}
