import { connectToDatabase } from "../../../../lib/mongodb";
import Approved_Block_Leave from "../../../../models/approved_block_leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({ success: false, message: "Missing user_id parameter" }, { status: 400 });
        }

        await connectToDatabase();

        const approvedLeaves = await Approved_Block_Leave.find({ user_id })
            .sort({ date: -1 }) // Sort by most recent date
            .lean();

        return NextResponse.json({ success: true, data: approvedLeaves }, { status: 200 });

    } catch (error) {
        console.error("Error fetching user's approved block leaves:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch user's approved block leaves due to server error." },
            { status: 500 }
        );
    }
}
