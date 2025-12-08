const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const mongoose = require('mongoose');

// --- Re-define Mongoose Model ---
// This is duplicated from models/users.ts to make this a standalone JS script
const userSchema = new mongoose.Schema({
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
const User = mongoose.models.User || mongoose.model('User', userSchema);
// --------------------------------

async function initializeDeploymentCount() {
    console.log("Starting deployment count initialization script (JS Version)...");
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) {
        throw new Error("Please define MONGODB_URI in .env.local");
    }

    const connection = await mongoose.createConnection(MONGO_URI).asPromise();
    console.log("✅ MongoDB Connection Created");

    try {
        const userModel = connection.model('User', userSchema);
        const filter = { $or: [{ reserve_deploy_count: { $exists: false } }, { reserve_deploy_count: null }] };

        const count = await userModel.countDocuments(filter);
        console.log(`Found ${count} documents to update.`);

        if (count > 0) {
            console.log("Attempting to update documents...");
            const updateResult = await userModel.updateMany(filter, { $set: { reserve_deploy_count: 0 } });
            console.log("Update result object:", updateResult);
        } else {
            console.log("No documents to update.");
        }
    } catch (error) {
        console.error("❌ Error during script execution:", error);
    } finally {
        await connection.close();
        console.log("Disconnected from MongoDB.");
    }
}

initializeDeploymentCount();
