// roster-app/app/api/leave/fetch-approved-month/route.ts

import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";
import moment from "moment-timezone";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get("year") || "", 10);
        const month = parseInt(searchParams.get("month") || "", 10); // 1-indexed month

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return NextResponse.json({ success: false, message: "Invalid year or month provided." }, { status: 400 });
        }

        await connectToDatabase();

        const startOfMonth = moment.utc([year, month - 1]).startOf('month').toDate(); // month is 0-indexed in moment
        const endOfMonth = moment.utc([year, month - 1]).endOf('month').toDate();

        const approvedLeaves = await Leave.find({
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
            },
            status: "Approved",
        }).select('user_id date leave_type sub_leave_type -_id').lean(); // Select relevant fields and use .lean()

        // Map leave_type for consistency with frontend BlockLeave and AdvanceLeave expectations
        const mappedLeaves = approvedLeaves.map(leave => ({
            user_id: leave.user_id,
            date: leave.date,
            leave_type: leave.leave_type === "Block Leave" ? "block" : 
                        leave.leave_type === "Advance Leave" ? "advance" : 
                        "other", // Default to 'other' for other leave types
            original_leave_type: leave.leave_type, // Keep original for popup if type is 'other'
            sub_leave_type: leave.sub_leave_type,
        }));

        return NextResponse.json({ success: true, data: mappedLeaves });

    } catch (error) {
        console.error("Error fetching all approved leaves for month:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch approved leaves due to server error." },
            { status: 500 }
        );
    }
}
