import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

interface ApplyLeavePayload {
    user_id: string;
    startDate: string;
    endDate: string;
    leave_type: string;
}

export async function POST(req: Request) {
    try {
        const { user_id, startDate, endDate, leave_type }: ApplyLeavePayload = await req.json();

        if (!user_id || !startDate || !endDate || !leave_type) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validation: Check for overlapping leave requests for the same user with Pending or Approved status
        const existingLeave = await Leave.findOne({
            user_id,
            date: { $gte: start, $lte: end }, // Check if any date in the range is already covered
            status: { $in: ["Pending", "Approved"] } // Only block if status is Pending or Approved
        });

        if (existingLeave) {
            return NextResponse.json({ success: false, message: "You already have a leave request for this period." }, { status: 409 });
        }

        // Create a new leave entry for each day in the range
        const leaveEntries = [];
        let currentDate = new Date(start);
        while (currentDate <= end) {
            leaveEntries.push({
                user_id,
                date: new Date(currentDate), // Store each day as a separate entry
                leave_type,
                status: "Pending", // Default status
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        await Leave.insertMany(leaveEntries);

        return NextResponse.json({ success: true, message: "Leave application submitted successfully." }, { status: 201 });

    } catch (error) {
        console.error("Leave Application Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to submit leave application due to server error." },
            { status: 500 }
        );
    }
}
