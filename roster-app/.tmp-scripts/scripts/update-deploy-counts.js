"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/update-deploy-counts.ts
const mongoose_client_1 = require("../lib/mongoose-client");
const mongoose_1 = __importDefault(require("mongoose"));
async function updateDeployCounts() {
    console.log("Starting script to update reserve_deploy_count for all users...");
    try {
        await (0, mongoose_client_1.connectToDatabase)();
        console.log("Database connection successful.");
        const users = await mongoose_client_1.User.find({});
        console.log(`Found ${users.length} users to update.`);
        for (const user of users) {
            const randomCount = Math.floor(Math.random() * (20 - 10 + 1)) + 10; // Random number between 10 and 20
            const updateResult = await mongoose_client_1.User.updateOne({ _id: user._id }, { $set: { reserve_deploy_count: randomCount } });
            if (updateResult.acknowledged && updateResult.modifiedCount > 0) {
                console.log(`Updated user ${user.user_id}: reserve_deploy_count set to ${randomCount}`);
            }
            else {
                console.warn(`Failed to update user ${user.user_id}. Result: ${JSON.stringify(updateResult)}`);
            }
        }
        console.log("Finished updating reserve_deploy_count for all users.");
    }
    catch (error) {
        console.error("An error occurred during deploy count update:", error);
    }
    finally {
        await mongoose_1.default.connection.close();
        console.log("Database connection closed.");
    }
}
updateDeployCounts();
