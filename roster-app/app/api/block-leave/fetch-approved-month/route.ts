
import { connectToDatabase } from "../../../../lib/mongodb";
import Approved_Block_Leave from "../../../../models/approved_block_leaves";
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
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0); // Last day of the month

        const approvedLeaves = await Approved_Block_Leave.find({
            date: {
                $gte: startDate,
                $lte: endDate,
            },
        }).lean();

        return NextResponse.json({ success: true, data: approvedLeaves }, { status: 200 });

    } catch (error) {
        console.error("Error fetching approved block leaves for month:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch approved block leaves due to server error." },
            { status: 500 }
        );
    }
}
