import { connectToDatabase } from "../../../../lib/mongodb";
import Pending_Block_Leave from "../../../../models/pending_block_leaves";
import Leave from "../../../../models/leaves"; // Changed from Approved_Block_Leave
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

        const approvedEntries = [];
        for (let m = moment.utc(start_date); m.isSameOrBefore(end_date); m.add(1, 'days')) {
            let mappedLeaveType: string;
            if (leave_type === 'block') {
                mappedLeaveType = 'Block Leave';
            } else if (leave_type === 'advance') {
                mappedLeaveType = 'Advance Leave';
            } else {
                // Handle unexpected leave_type, though enum should prevent this
                mappedLeaveType = leave_type; 
            }

            console.log(`DEBUG: Original pendingLeave.leave_type: '${leave_type}', Mapped leave_type: '${mappedLeaveType}'`); // Debug log

            approvedEntries.push({
                user_id,
                date: m.toDate(),
                leave_type: mappedLeaveType,
                sub_leave_type, // Now supported by the Leaves schema
                status: "Approved", // Set status to Approved
            });
        }

        if (approvedEntries.length > 0) {
            await Leave.insertMany(approvedEntries); // Insert into Leaves collection
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