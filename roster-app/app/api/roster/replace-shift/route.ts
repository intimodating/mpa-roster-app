import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";
import mongoose from "mongoose"; // Re-add this import

export async function POST(req: Request) {
    try {
        const { leave_id, applicant_user_id, replacement_user_id, date } = await req.json();

        if (!leave_id || !applicant_user_id || !replacement_user_id || !date) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        // Use IDs as-is based on previous successful fix
        const applicantId = applicant_user_id;
        const replacementId = replacement_user_id;

        await connectToDatabase();

        console.log("User model collection name:", User.collection.collectionName);

        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        // 1. Find the applicant's shift and update it
        const rosterUpdateResult = await Roster.updateOne(
            { user_id: applicantId, date: { $gte: startOfDay, $lt: endOfDay } },
            { $set: { user_id: replacementId } }
        );

        if (rosterUpdateResult.matchedCount === 0) {
            throw new Error("Could not find the original shift to replace.");
        }

        // 2. Approve the leave
        const leaveUpdateResult = await Leave.updateOne(
            { _id: leave_id },
            { $set: { status: 'Approved' } }
        );

        if (leaveUpdateResult.matchedCount === 0) {
            throw new Error("Shift was replaced, but failed to approve the leave record.");
        }

        // Debugging step suggested by user
        console.log("Mongoose connection state:", mongoose.connection.readyState);

        // Atomically increment the reserve_deploy_count for the replacement user
        console.log(`Attempting to increment reserve_deploy_count for user: ${replacementId}`);
        const incrementResult = await User.updateOne(
            { user_id: replacementId },
            { $inc: { reserve_deploy_count: 1 } }
        );
        
        console.log("Full increment result:", JSON.stringify(incrementResult, null, 2));

        if (incrementResult.acknowledged && incrementResult.modifiedCount > 0) {
            console.log(`Successfully incremented reserve_deploy_count for user: ${replacementId}`);
        } else {
            console.warn(`Failed to increment reserve_deploy_count for user: ${replacementId}. Result: ${JSON.stringify(incrementResult)}`);
        }

        return NextResponse.json({ success: true, message: "Shift replaced, leave approved, and deployment count updated." });

    } catch (error: unknown) {
        console.error("Error replacing shift:", error);
        let errorMessage = "Failed to replace shift";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json({ success: false, message: errorMessage }, { status: 500 });
    }
}
