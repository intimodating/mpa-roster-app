
// app/api/roster/approve/route.ts
import { connectToDatabase } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster";
import { NextResponse } from "next/server";

interface WorkerAssignment {
    user_id: string;
    assigned_console?: string;
}

interface ShiftDetails {
    Morning: (string | WorkerAssignment)[];
    Afternoon: (string | WorkerAssignment)[];
    Night: (string | WorkerAssignment)[];
}

interface ApprovePayload {
    roster: Record<string, {
        East: ShiftDetails;
        West: ShiftDetails;
    }>;
}

export async function POST(req: Request) {
    try {
        const { roster }: ApprovePayload = await req.json();

        if (!roster) {
            return NextResponse.json({ success: false, message: "Roster data is required" }, { status: 400 });
        }

        await connectToDatabase();

        const allDates = Object.keys(roster);
        if (allDates.length === 0) {
            return NextResponse.json({ success: true, message: "No roster data to approve." });
        }

        const dateObjects = allDates.map(d => new Date(d + 'T00:00:00.000Z'));
        
        // Delete all existing entries for the dates being approved
        await Roster.deleteMany({
            date: { $in: dateObjects }
        });

        const allNewAssignments = [];
        const logs: string[] = [];

        for (const date in roster) {
            logs.push(`Processing date: ${date}`);
            const startOfDayUTC = new Date(date + 'T00:00:00.000Z');

            const locations = ['East', 'West'];
            const shiftTypes = ['Morning', 'Afternoon', 'Night'];

            for (const location of locations) {
                for (const shiftType of shiftTypes) {
                    const dayData = roster[date][location as keyof typeof roster[typeof date]];
                    if (!dayData) continue;
                    
                    const employees = dayData[shiftType as keyof ShiftDetails];
                    if (!employees) continue;

                    for (const entry of employees) {
                        const isObject = typeof entry === 'object' && entry !== null;
                        const userId = isObject ? (entry as WorkerAssignment).user_id : entry as string;
                        const assignedConsole = isObject ? (entry as WorkerAssignment).assigned_console : undefined;

                        allNewAssignments.push({
                            user_id: userId,
                            date: startOfDayUTC,
                            shift_type: shiftType,
                            location: location,
                            assigned_console: assignedConsole,
                        });
                    }
                }
            }
        }

        if (allNewAssignments.length > 0) {
            await Roster.insertMany(allNewAssignments);
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
