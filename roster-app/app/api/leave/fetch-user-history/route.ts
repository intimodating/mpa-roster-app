import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
        }

        await connectToDatabase();

        const userLeaveHistory = await Leave.find({ user_id: userId }).sort({ date: -1 }); // Sort by most recent date first

        return NextResponse.json({ success: true, data: userLeaveHistory });

    } catch (error) {
        console.error("Fetch User Leave History Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch user leave history due to server error." },
            { status: 500 }
        );
    }
}
