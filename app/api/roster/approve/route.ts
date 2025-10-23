
// app/api/roster/approve/route.ts
import { connectToDatabase } from "../../../../lib/mongodb";
import Roster from "../../../../models/roster";
import { NextResponse } from "next/server";

interface ApprovePayload {
    roster: Record<string, { dayShift: string[], nightShift: string[] }>;
}

export async function POST(req: Request) {
    try {
        const { roster }: ApprovePayload = await req.json();

        if (!roster) {
            return NextResponse.json({ success: false, message: "Roster data is required" }, { status: 400 });
        }

        await connectToDatabase();

        const logs: string[] = [];
        for (const date in roster) {
            logs.push(`Processing date: ${date}`);
            const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
            const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000));

            const dateFilter = {
                date: {
                    $gte: startOfDayUTC,
                    $lt: endOfDayUTC
                }
            };

            await Roster.deleteMany(dateFilter);

            const newAssignments = [];
            const { dayShift, nightShift } = roster[date];

            for (const employeeName of dayShift) {
                newAssignments.push({
                    user_id: employeeName,
                    date: startOfDayUTC,
                    shift_type: 'Day Shift'
                });
            }

            for (const employeeName of nightShift) {
                newAssignments.push({
                    user_id: employeeName,
                    date: startOfDayUTC,
                    shift_type: 'Night Shift'
                });
            }

            if (newAssignments.length > 0) {
                await Roster.insertMany(newAssignments);
            }
        }

        return NextResponse.json({ success: true, message: "Roster approved and saved successfully.", logs });

    } catch (error) {
        console.error("Roster Approve Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to approve roster due to server error." 
        }, { status: 500 });
    }
}
