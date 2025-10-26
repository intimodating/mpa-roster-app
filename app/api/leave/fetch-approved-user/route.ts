import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        if (!userId || !startDateStr || !endDateStr) {
            return NextResponse.json({ success: false, message: "User ID, start date, and end date are required." }, { status: 400 });
        }

        await connectToDatabase();

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const approvedLeaves = await Leave.find({
            user_id: userId,
            status: "Approved",
            date: { $gte: startDate, $lte: endDate }
        }).select('date -_id');

        // Return an array of date strings for approved leaves
        const approvedLeaveDates = approvedLeaves.map(leave => leave.date.toISOString().split('T')[0]);

        return NextResponse.json({ success: true, data: approvedLeaveDates });

    } catch (error) {
        console.error("Fetch Approved User Leaves Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch approved user leave requests due to server error." },
            { status: 500 }
        );
    }
}
