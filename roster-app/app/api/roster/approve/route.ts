
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
            const locations = ['East', 'West'];
            const shiftTypes = ['Morning', 'Afternoon', 'Night'];

            for (const location of locations) {
                for (const shiftType of shiftTypes) {
                    const employees = roster[date][location as keyof typeof roster[typeof date]][shiftType as keyof ShiftDetails];
                    for (const entry of employees) {
                        const isObject = typeof entry === 'object' && entry !== null;
                        const userId = isObject ? (entry as WorkerAssignment).user_id : entry as string;
                        const assignedConsole = isObject ? (entry as WorkerAssignment).assigned_console : undefined;

                        newAssignments.push({
                            user_id: userId,
                            date: startOfDayUTC,
                            shift_type: shiftType,
                            location: location,
                            assigned_console: assignedConsole,
                        });
                    }
                }
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
