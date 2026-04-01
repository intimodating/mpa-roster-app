import { NextResponse } from 'next/server';
import { connectToDatabase, User } from '../../../../lib/mongoose-client';
import Roster from '../../../../models/roster';
import Leaves from '../../../../models/leaves';

export async function POST(req: Request) {
    try {
        const { startDate, endDate } = await req.json();

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, message: "Dates are required" }, { status: 400 });
        }

        await connectToDatabase();

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Reset times to start/end of day to capture everything
        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(23, 59, 59, 999);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const totalDaysInRange = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 1. Fetch all Non-Planner users
        const users = await User.find({ account_type: 'Non-Planner' }).select('user_id name').lean();

        // 2. Fetch all shifts in range
        const shifts = await Roster.find({
            date: { $gte: start, $lte: end }
        }).lean();

        // 3. Fetch all approved leaves in range
        const leaves = await Leaves.find({
            date: { $gte: start, $lte: end },
            status: 'Approved'
        }).lean();

        // 4. Aggregate data per user
        const reportData = users.map((user: any) => {
            const userShifts = shifts.filter((s: any) => s.user_id === user.user_id);
            const userLeaves = leaves.filter((l: any) => l.user_id === user.user_id);

            const eastMorningCount = userShifts.filter((s: any) => s.shift_type === 'Morning' && s.location === 'East').length;
            const eastAfternoonCount = userShifts.filter((s: any) => s.shift_type === 'Afternoon' && s.location === 'East').length;
            const eastNightCount = userShifts.filter((s: any) => s.shift_type === 'Night' && s.location === 'East').length;

            const westMorningCount = userShifts.filter((s: any) => s.shift_type === 'Morning' && s.location === 'West').length;
            const westAfternoonCount = userShifts.filter((s: any) => s.shift_type === 'Afternoon' && s.location === 'West').length;
            const westNightCount = userShifts.filter((s: any) => s.shift_type === 'Night' && s.location === 'West').length;

            const ojtCount = userShifts.filter((s: any) => s.is_ojt).length;
            
            const totalShifts = userShifts.length;
            const totalLeaves = userLeaves.length;
            
            // Off days = total days in range - shifts - leaves
            const offDays = Math.max(0, totalDaysInRange - totalShifts - totalLeaves);

            return {
                "Staff ID": user.user_id,
                "Staff Name": user.name || user.user_id,
                "Total East Morning": eastMorningCount,
                "Total East Afternoon": eastAfternoonCount,
                "Total East Night": eastNightCount,
                "Total West Morning": westMorningCount,
                "Total West Afternoon": westAfternoonCount,
                "Total West Night": westNightCount,
                "Total OJT": ojtCount,
                "Total Shifts": totalShifts,
                "Total Off Days": offDays,
                "Total Leaves": totalLeaves
            };
        });

        return NextResponse.json({ 
            success: true, 
            data: reportData,
            period: { start: startDate, end: endDate }
        });

    } catch (error) {
        console.error("Export API Error:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
