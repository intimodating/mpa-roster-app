import { connectToDatabase } from "../../../../lib/mongodb";
import Pending_Block_Leave from "../../../../models/pending_block_leaves";
import Approved_Block_Leave from "../../../../models/approved_block_leaves";
import { NextResponse } from "next/server";
import moment from "moment-timezone";

interface ApproveBlockLeavePayload {
    id: string; // The _id of the Pending_Block_Leave document
}

export async function POST(req: Request) {
    try {
        const { id }: ApproveBlockLeavePayload = await req.json();

        if (!id) {
            return NextResponse.json({ success: false, message: "Missing pending leave ID" }, { status: 400 });
        }

        await connectToDatabase();

        const pendingLeave = await Pending_Block_Leave.findById(id);

        if (!pendingLeave) {
            return NextResponse.json({ success: false, message: "Pending block leave not found." }, { status: 404 });
        }

        const { user_id, start_date, end_date, leave_type, sub_leave_type } = pendingLeave;

        // --- Bug Fix 1: Off-by-one date error ---
        // Use a moment.utc loop to ensure date consistency
        const approvedEntries = [];
        for (let m = moment.utc(start_date); m.isSameOrBefore(end_date); m.add(1, 'days')) {
            approvedEntries.push({
                user_id,
                date: m.toDate(),
                leave_type,
                sub_leave_type,
            });
        }
        // --- End of Bug Fix 1 ---

        if (approvedEntries.length > 0) {
            await Approved_Block_Leave.insertMany(approvedEntries);
        }

        // Delete the pending leave
        await Pending_Block_Leave.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: "Block leave approved successfully." }, { status: 200 });

    } catch (error) {
        console.error("Error approving block leave:", error);
        return NextResponse.json(
            { success: false, message: "Failed to approve block leave due to server error." },
            { status: 500 }
        );
    }
}