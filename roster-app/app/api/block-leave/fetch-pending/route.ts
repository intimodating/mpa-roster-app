
import { connectToDatabase } from "../../../../lib/mongodb";
import Pending_Block_Leave from "../../../../models/pending_block_leaves";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        await connectToDatabase();

        const pendingLeaves = await Pending_Block_Leave.find({})
            .sort({ start_date: 1, applied_at: 1 })
            .lean(); // Use .lean() for faster retrieval if not modifying the documents

        return NextResponse.json({ success: true, data: pendingLeaves }, { status: 200 });

    } catch (error) {
        console.error("Error fetching pending block leaves:", error);
        return NextResponse.json(
            { success: false, message: "Failed to fetch pending block leaves due to server error." },
            { status: 500 }
        );
    }
}
