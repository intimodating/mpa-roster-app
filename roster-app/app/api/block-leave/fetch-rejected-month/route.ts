
import { connectToDatabase } from "../../../../lib/mongodb";
import Rejected_Block_Leave from "../../../../models/rejected_block_leaves";
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

        // MongoDB months are 0-indexed
        const month_start_date = new Date(year, month - 1, 1);
        const month_end_date = new Date(year, month, 1);

        // Find rejected leaves that overlap with the given month.
        const rejectedLeaves = await Rejected_Block_Leave.find({
            start_date: { $lt: month_end_date },
            end_date: { $gte: month_start_date },
        }).lean();

        return NextResponse.json({ success: true, data: rejectedLeaves }, { status: 200 });

    } catch (error) {
        console.error("Error fetching rejected block leaves for month:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch rejected block leaves for month due to server error." },
            { status: 500 }
        );
    }
}
