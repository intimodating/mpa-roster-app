import { connectToDatabase } from "../../../../lib/mongodb";
import Pending_Block_Leave from "../../../../models/pending_block_leaves";
import Approved_Block_Leave from "../../../../models/approved_block_leaves";
import { NextResponse } from "next/server";
import moment from "moment-timezone";

interface ApplyBlockLeavePayload {
    user_id: string;
    start_date: string;
    end_date: string;
    leave_type: "block" | "advance";
    remarks?: string;
    sub_leave_type?: string;
}

const DAILY_QUOTA_LIMIT = 10;

// Helper to get current Singapore time
export function getCurrentSingaporeTime() {
    return moment().tz('Asia/Singapore').toDate();
}

export async function POST(req: Request) {
    try {
        const { user_id, start_date, end_date, leave_type, remarks, sub_leave_type }: ApplyBlockLeavePayload = await req.json();

        console.log("Received sub_leave_type:", sub_leave_type);

        if (!user_id || !start_date || !end_date || !leave_type) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Use moment.utc() to avoid timezone issues. Dates from client are treated as UTC.
        const start = moment.utc(start_date).startOf('day').toDate();
        const end = moment.utc(end_date).startOf('day').toDate();

        if (moment(end).isBefore(start)) {
            return NextResponse.json({ success: false, message: "End date cannot be before start date." }, { status: 400 });
        }

        // --- Bug Fix 2: Check for overlapping leaves ---
        // Check 1: Overlap with existing Approved_Block_Leaves
        const existingApprovedLeave = await Approved_Block_Leave.findOne({
            user_id,
            date: { $gte: start, $lte: end },
        });

        if (existingApprovedLeave) {
            return NextResponse.json({ success: false, message: "You have an existing approved leave in this period." }, { status: 409 });
        }

        // Check 2: Overlap with existing Pending_Block_Leaves
        const existingPendingLeave = await Pending_Block_Leave.findOne({
            user_id,
            // Check for any overlap: (ExistingStart <= NewEnd) and (ExistingEnd >= NewStart)
            start_date: { $lte: end },
            end_date: { $gte: start },
        });

        if (existingPendingLeave) {
            return NextResponse.json({ success: false, message: "You have an existing pending leave application that overlaps with this period." }, { status: 409 });
        }
        // --- End of Bug Fix 2 ---


        // Check daily quota for each day in the requested range
        let quotaExceededDays: Date[] = [];
        for (let d = moment(start); d.isSameOrBefore(end); d.add(1, 'day')) {
            const day = d.toDate();
            const dayStart = moment.utc(day).startOf('day').toDate();
            const dayEnd = moment.utc(day).endOf('day').toDate();
            
            const approvedCount = await Approved_Block_Leave.countDocuments({
                date: {
                    $gte: dayStart,
                    $lt: dayEnd
                }
            });

            if (approvedCount >= DAILY_QUOTA_LIMIT) {
                quotaExceededDays.push(day);
            }
        }

        let warningMessage = "";
        if (quotaExceededDays.length > 0) {
            warningMessage = `Warning: The daily quota is full for: ${quotaExceededDays.map(d => moment(d).format('DD MMM')).join(", ")}. You may still proceed.`;
        }

        const newLeave = {
            user_id,
            start_date: start,
            end_date: end,
            leave_type,
            remarks,
            sub_leave_type,
            applied_at: getCurrentSingaporeTime(),
        };

        // Create a new document in Pending_Block_Leaves
        const pendingLeaveDoc = new Pending_Block_Leave(newLeave);
        await pendingLeaveDoc.save();

        return NextResponse.json({
            success: true,
            message: "Block/Advance leave application submitted successfully.",
            warning: warningMessage,
        }, { status: 201 });

    } catch (error) {
        console.error("Block/Advance Leave Application Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to submit application due to server error." },
            { status: 500 }
        );
    }
}