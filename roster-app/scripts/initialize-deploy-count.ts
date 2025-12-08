const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const mongoose = require('mongoose');
const User = require('../models/users').default;

async function initializeDeploymentCount() {
    console.log("Starting deployment count initialization script...");
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) {
        throw new Error("Please define MONGODB_URI in .env.local");
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const filter = { $or: [{ reserve_deploy_count: { $exists: false } }, { reserve_deploy_count: null }] };

        const count = await User.countDocuments(filter);
        console.log(`Found ${count} documents to update.`);

        if (count > 0) {
            console.log("Attempting to update documents...");
            const updateResult = await User.updateMany(
                filter,
                { $set: { reserve_deploy_count: 0 } }
            );
            console.log("Update result object:", updateResult);
        } else {
            console.log("No documents to update.");
        }

        console.log(`✅ Script finished successfully!`);

    } catch (error) {
        console.error("❌ Error during script execution:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Disconnected from MongoDB.");
    }
}

initializeDeploymentCount();
