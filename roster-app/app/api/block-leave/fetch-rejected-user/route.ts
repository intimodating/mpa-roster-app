import { connectToDatabase } from "../../../../lib/mongodb";
import Rejected_Block_Leave from "../../../../models/rejected_block_leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get('user_id');

        if (!user_id) {
            return NextResponse.json({ success: false, message: "Missing user_id parameter" }, { status: 400 });
        }

        await connectToDatabase();

        const rejectedLeaves = await Rejected_Block_Leave.find({ user_id })
            .sort({ rejected_at: -1 }) // Sort by most recently rejected
            .lean();

        return NextResponse.json({ success: true, data: rejectedLeaves }, { status: 200 });

    } catch (error) {
        console.error("Error fetching user's rejected block leaves:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch user's rejected block leaves due to server error." },
            { status: 500 }
        );
    }
}
