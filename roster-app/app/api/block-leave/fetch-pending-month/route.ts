
import { connectToDatabase } from "../../../../lib/mongodb";
import Pending_Block_Leave from "../../../../models/pending_block_leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || '', 10);
        const month = parseInt(searchParams.get('month') || '', 10); // 1-indexed month

        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return NextResponse.json({ success: false, message: "Invalid year or month provided." }, { status: 400 });
        }

        await connectToDatabase();

        // MongoDB months are 0-indexed, so adjust the input month
        const month_start_date = new Date(year, month - 1, 1);
        const month_end_date = new Date(year, month, 1); // First day of next month

        // Find pending leaves that overlap with the given month.
        // A leave overlaps if:
        // - its start_date is before the month's end_date AND
        // - its end_date is after the month's start_date
        const pendingLeaves = await Pending_Block_Leave.find({
            start_date: { $lt: month_end_date },
            end_date: { $gte: month_start_date },
        }).lean();

        return NextResponse.json({ success: true, data: pendingLeaves }, { status: 200 });

    } catch (error) {
        console.error("Error fetching pending block leaves for month:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch pending block leaves for month due to server error." },
            { status: 500 }
        );
    }
}
