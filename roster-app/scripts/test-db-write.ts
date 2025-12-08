import mongoose from "mongoose";
import { connectToDatabase } from "../lib/mongodb.js";
import User from "../models/users.js";

async function testDatabaseWrite() {
  console.log("Starting database write test...");

  try {
    await connectToDatabase();
    console.log("Database connection successful.");

    const testUserId = `testuser_${Date.now()}`;
    console.log(`Creating a test user with user_id: ${testUserId}`);

    // 1. Create a new user
    const newUser = new User({
      user_id: testUserId,
      password: "testpassword",
      account_type: "Non-Planner",
      proficiency_grade: 1,
      name: "Test User",
      email: "test@example.com",
      reserve_deploy_count: 0,
    });

    const saveResult = await newUser.save();
    console.log("User creation result:", JSON.stringify(saveResult, null, 2));

    // 2. Find the user to make sure it was created
    const foundUser = await User.findOne({ user_id: testUserId });
    if (foundUser) {
      console.log("Successfully found the created user.");
    } else {
      console.error("Could not find the user that was just created.");
      return;
    }

    // 3. Increment the reserve_deploy_count
    console.log(`Attempting to increment reserve_deploy_count for user: ${testUserId}`);
    const incrementResult = await User.updateOne(
      { user_id: testUserId },
      { $inc: { reserve_deploy_count: 1 } }
    );

    console.log("Full increment result:", JSON.stringify(incrementResult, null, 2));

    if (incrementResult.acknowledged && incrementResult.modifiedCount > 0) {
      console.log("Successfully incremented reserve_deploy_count.");
    } else {
      console.error("Failed to increment reserve_deploy_count.");
    }

    // 4. Verify the final count
    const updatedUser = await User.findOne({ user_id: testUserId });
    if (updatedUser) {
      console.log(`Final reserve_deploy_count: ${updatedUser.reserve_deploy_count}`);
    } else {
      console.error("Could not find the user after update.");
    }

    // 5. Clean up the test user
    console.log(`Deleting test user: ${testUserId}`);
    const deleteResult = await User.deleteOne({ user_id: testUserId });
    console.log("Deletion result:", JSON.stringify(deleteResult, null, 2));


  } catch (error) {
    console.error("An error occurred during the database write test:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

testDatabaseWrite();
