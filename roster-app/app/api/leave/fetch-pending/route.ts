import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectToDatabase();

        const pendingLeaves = await Leave.find({ status: "Pending" }).sort({ date: 1 });

        return NextResponse.json({ success: true, data: pendingLeaves });

    } catch (error) {
        console.error("Fetch Pending Leaves Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch pending leave requests due to server error." },
            { status: 500 }
        );
    }
}
