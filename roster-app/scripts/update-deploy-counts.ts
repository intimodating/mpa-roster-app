// scripts/update-deploy-counts.ts
import { connectToDatabase, User } from "../lib/mongoose-client";
import mongoose from "mongoose";

async function updateDeployCounts() {
  console.log("Starting script to update reserve_deploy_count for all users...");

  try {
    await connectToDatabase();
    console.log("Database connection successful.");

    const users = await User.find({});
    console.log(`Found ${users.length} users to update.`);

    for (const user of users) {
      const randomCount = Math.floor(Math.random() * (20 - 10 + 1)) + 10; // Random number between 10 and 20
      
      const updateResult = await User.updateOne(
        { _id: user._id },
        { $set: { reserve_deploy_count: randomCount } }
      );

      if (updateResult.acknowledged && updateResult.modifiedCount > 0) {
        console.log(`Updated user ${user.user_id}: reserve_deploy_count set to ${randomCount}`);
      } else {
        console.warn(`Failed to update user ${user.user_id}. Result: ${JSON.stringify(updateResult)}`);
      }
    }

    console.log("Finished updating reserve_deploy_count for all users.");

  } catch (error) {
    console.error("An error occurred during deploy count update:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

updateDeployCounts();
