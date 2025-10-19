// lib/mongodb.ts
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI; // <-- make sure this matches your .env.local

if (!MONGO_URI) {
  throw new Error("Please define MONGO_URI in .env.local");
}

export async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return; // already connected
  try {
    await mongoose.connect(MONGO_URI!);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}
