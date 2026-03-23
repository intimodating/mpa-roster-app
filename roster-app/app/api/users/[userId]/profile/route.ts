import { connectToDatabase } from "../../../../../lib/mongoose-client";
import User from "../../../../../models/users";
import Competency from "../../../../../models/competencies";
import Roster from "../../../../../models/roster";
import Leave from "../../../../../models/leaves";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        await connectToDatabase();
        const { userId } = await params;
        if (!userId) {
            return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
        }
        const normalizedUserId = userId.toLowerCase();

        const user = await User.findOne({ user_id: { $regex: new RegExp(`^${normalizedUserId}$`, 'i') } }).select("-password").lean();
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const competencies = await Competency.find({ user_id: { $regex: new RegExp(`^${normalizedUserId}$`, 'i') } }).lean();

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const recentShifts = await Roster.find({
            user_id: { $regex: new RegExp(`^${normalizedUserId}$`, 'i') },
            date: { $gte: threeMonthsAgo },
            shift_type: { $ne: "Leave" }
        }).lean();

        const recentLeaves = await Leave.find({
            user_id: { $regex: new RegExp(`^${normalizedUserId}$`, 'i') },
            date: { $gte: threeMonthsAgo },
            status: "Approved"
        }).lean();

        const shiftStats: Record<string, number> = {};
        recentShifts.forEach((shift: any) => {
            if (shift.assigned_console) {
                shiftStats[shift.assigned_console] = (shiftStats[shift.assigned_console] || 0) + 1;
            } else {
                shiftStats["Reserve"] = (shiftStats["Reserve"] || 0) + 1;
            }
        });

        const leaveStats: Record<string, number> = {};
        recentLeaves.forEach((leave: any) => {
            leaveStats[leave.leave_type] = (leaveStats[leave.leave_type] || 0) + 1;
        });

        return NextResponse.json({
            success: true,
            data: {
                user,
                competencies,
                shifts: {
                    total: recentShifts.length,
                    breakdown: shiftStats
                },
                leaves: {
                    total: recentLeaves.length,
                    breakdown: leaveStats
                }
            }
        });
    } catch (error) {
        console.error("Profile API Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
