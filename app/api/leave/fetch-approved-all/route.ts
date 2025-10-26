import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        if (!startDateStr || !endDateStr) {
            return NextResponse.json({ success: false, message: "Start date and end date are required." }, { status: 400 });
        }

        await connectToDatabase();

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        const approvedLeaves = await Leave.find({
            status: "Approved",
            date: { $gte: startDate, $lte: endDate }
        }).select('user_id date -_id');

        // Aggregate leaves by date
        const leavesByDate: Record<string, string[]> = {};
        approvedLeaves.forEach(leave => {
            const dateKey = leave.date.toISOString().split('T')[0];
            if (!leavesByDate[dateKey]) {
                leavesByDate[dateKey] = [];
            }
            leavesByDate[dateKey].push(leave.user_id);
        });

        return NextResponse.json({ success: true, data: leavesByDate });

    } catch (error) {
        console.error("Fetch All Approved Leaves Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch all approved leave requests due to server error." },
            { status: 500 }
        );
    }
}
