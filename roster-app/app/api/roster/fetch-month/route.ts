import { connectToDatabase } from "../../../../lib/mongoose-client"; 
import Roster from "../../../../models/roster";
import User from "../../../../models/users";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

interface ShiftData {
    Morning: string[];
    Afternoon: string[];
    Night: string[];
}

interface LocationShiftData {
    East: ShiftData;
    West: ShiftData;
}

type RosterMap = Record<string, LocationShiftData>;

export async function GET(req: Request) {
    const url = new URL(req.url);
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');
    const userId = url.searchParams.get('userId');

    if (!startDateStr || !endDateStr || !userId) {
        return NextResponse.json({ 
            success: false, 
            message: "startDate, endDate, and userId parameters are required." 
        }, { status: 400 });
    }

    try {
        await connectToDatabase();

        const user = await User.findOne({ user_id: userId }).select('account_type');
        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        const startDateUTC = new Date(startDateStr);
        const endDateUTC = new Date(endDateStr);

        const dateFilter = {
            date: {
                $gte: startDateUTC,
                $lt: endDateUTC
            }
        };

        if (user.account_type === 'Planner') {
            const assignments = await Roster.find(dateFilter).select('user_id shift_type date location -_id');
            const rosterMap: RosterMap = {};

            assignments.forEach(assignment => {
                const dateKey = assignment.date.toISOString().split('T')[0];
                
                if (!rosterMap[dateKey]) {
                    rosterMap[dateKey] = {
                        East: { Morning: [], Afternoon: [], Night: [] },
                        West: { Morning: [], Afternoon: [], Night: [] },
                    };
                }

                const location = assignment.location as keyof LocationShiftData;
                const shiftType = assignment.shift_type as keyof ShiftData;

                if (location && (shiftType === 'Morning' || shiftType === 'Afternoon' || shiftType === 'Night') && rosterMap[dateKey][location]) {
                    rosterMap[dateKey][location][shiftType].push(assignment.user_id);
                }
            });
            
            const leaves = await Leave.find({ ...dateFilter, status: 'Approved' }).select('user_id date leave_type sub_leave_type -_id');
            const leavesMap: Record<string, { user_id: string; leave_type: string; sub_leave_type?: string }[]> = {};
            leaves.forEach(leave => {
                const dateKey = leave.date.toISOString().split('T')[0];
                if (!leavesMap[dateKey]) leavesMap[dateKey] = [];
                leavesMap[dateKey].push({
                    user_id: leave.user_id,
                    leave_type: leave.leave_type,
                    sub_leave_type: leave.sub_leave_type,
                });
            });

            return NextResponse.json({ 
                success: true, 
                isPlanner: true,
                message: `Roster data for ${startDateStr.split('T')[0]} to ${endDateStr.split('T')[0]} fetched.`,
                data: { roster: rosterMap, leaves: leavesMap }
            });

        } else { // Non-Planner
            const userStatusMap: Record<string, string> = {};

            const userAssignments = await Roster.find({ ...dateFilter, user_id: userId }).select('shift_type date -_id');
            userAssignments.forEach(assignment => {
                const dateKey = assignment.date.toISOString().split('T')[0];
                userStatusMap[dateKey] = assignment.shift_type;
            });

            const userLeaves = await Leave.find({ ...dateFilter, user_id: userId, status: 'Approved' }).select('date -_id');
            userLeaves.forEach(leave => {
                const dateKey = leave.date.toISOString().split('T')[0];
                userStatusMap[dateKey] = 'On Leave';
            });

            return NextResponse.json({
                success: true,
                isPlanner: false,
                message: `Your schedule for ${startDateStr.split('T')[0]} to ${endDateStr.split('T')[0]} fetched.`,
                data: userStatusMap
            });
        }
        
    } catch (error) {
        console.error("Month Fetch Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to fetch month roster data." 
        }, { status: 500 });
    }
}