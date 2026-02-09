
import { connectToDatabase } from "../../../../lib/mongodb";
import Pending_Block_Leave from "../../../../models/pending_block_leaves";
import Rejected_Block_Leave from "../../../../models/rejected_block_leaves";
import { NextResponse } from "next/server";

interface RejectBlockLeavePayload {
    id: string; // The _id of the Pending_Block_Leave document
    rejection_reason: string;
}

export async function POST(req: Request) {
    try {
        const { id, rejection_reason }: RejectBlockLeavePayload = await req.json();

        if (!id || !rejection_reason) {
            return NextResponse.json({ success: false, message: "Missing pending leave ID or rejection reason" }, { status: 400 });
        }

        await connectToDatabase();

        const pendingLeave = await Pending_Block_Leave.findById(id);

        if (!pendingLeave) {
            return NextResponse.json({ success: false, message: "Pending block leave not found." }, { status: 404 });
        }

        // Create a rejected leave record
        await Rejected_Block_Leave.create({
            user_id: pendingLeave.user_id,
            start_date: pendingLeave.start_date,
            end_date: pendingLeave.end_date,
            leave_type: pendingLeave.leave_type,
            sub_leave_type: pendingLeave.sub_leave_type,
            remarks: pendingLeave.remarks,
            applied_at: pendingLeave.applied_at,
            rejection_reason: rejection_reason,
            rejected_at: new Date(),
        });

        // Delete the pending leave
        await Pending_Block_Leave.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: "Block leave rejected successfully." }, { status: 200 });

    } catch (error) {
        console.error("Error rejecting block leave:", error);
        return NextResponse.json(
            { success: false, message: "Failed to reject block leave due to server error." },
            { status: 500 }
        );
    }
}
