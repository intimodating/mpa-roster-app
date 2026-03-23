import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster"; 
import OJT from "../../../../models/ojt";
import { NextResponse } from "next/server";

interface WorkerAssignment {
    user_id: string;
    assigned_console?: string;
    is_ojt?: boolean;
}

interface ShiftDetails {
    Morning: WorkerAssignment[];
    Afternoon: WorkerAssignment[];
    Night: WorkerAssignment[];
}

interface UpdatePayload {
    date: string; 
    East: ShiftDetails;
    West: ShiftDetails;
}

export async function POST(req: Request) {
    try {
        const { date, East, West }: UpdatePayload = await req.json();

        if (!date) {
            return NextResponse.json({ success: false, message: "Date is required" }, { status: 400 });
        }

        await connectToDatabase();

        // --- 1. Validate User IDs ---
        const extractIds = (shifts: WorkerAssignment[]) => shifts.map(s => s.user_id);

        const allEmployeeIds = [
            ...new Set([
                ...extractIds(East.Morning), ...extractIds(East.Afternoon), ...extractIds(East.Night),
                ...extractIds(West.Morning), ...extractIds(West.Afternoon), ...extractIds(West.Night),
            ]),
        ];

        if (allEmployeeIds.length > 0) {
            const existingUsers = await User.find({ user_id: { $in: allEmployeeIds } }).select('user_id');
            const existingUserIds = new Set(existingUsers.map(user => user.user_id));

            const invalidUserIds = allEmployeeIds.filter(id => !existingUserIds.has(id));

            if (invalidUserIds.length > 0) {
                return NextResponse.json(
                    { success: false, message: `Invalid User IDs found: ${invalidUserIds.join(', ')}. Roster cannot be saved.` },
                    { status: 400 }
                );
            }
        }

        // --- 2. Prepare Date Range for Query ---
        const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000)); 

        const dateFilter = {
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC
            }
        };

        // --- 3. TRACK OJT CHANGES ---
        // Fetch existing OJT records in roster for this date to see what's removed
        const existingOjtAssignments = await Roster.find({ ...dateFilter, is_ojt: true }).lean();
        
        const newAssignments: any[] = [];
        const locations = { East, West };
        
        for (const [location, shiftTypes] of Object.entries(locations)) {
            for (const [shiftType, employees] of Object.entries(shiftTypes)) {
                for (const entry of (employees as WorkerAssignment[])) {
                    newAssignments.push({
                        user_id: entry.user_id, 
                        date: startOfDayUTC, 
                        shift_type: shiftType, 
                        location: location,
                        assigned_console: entry.assigned_console,
                        is_ojt: !!entry.is_ojt
                    });
                }
            }
        }

        // Calculate OJT diff using a count-based approach for each (user, console)
        const ojtDeltaMap: Record<string, number> = {}; // key: "user_id|console"

        // New OJT assignments
        for (const a of newAssignments.filter(a => a.is_ojt)) {
            const key = `${a.user_id}|${a.assigned_console}`;
            ojtDeltaMap[key] = (ojtDeltaMap[key] || 0) + 1;
        }

        // Existing OJT assignments (to be removed)
        for (const a of existingOjtAssignments) {
            const key = `${a.user_id}|${a.assigned_console}`;
            ojtDeltaMap[key] = (ojtDeltaMap[key] || 0) - 1;
        }

        // Update OJT Collection
        const ojtOps: any[] = [];
        
        for (const [key, delta] of Object.entries(ojtDeltaMap)) {
            if (delta === 0) continue;
            const [user_id, console] = key.split('|');
            ojtOps.push({
                updateOne: {
                    filter: { user_id, console },
                    update: { $inc: { shift_number: delta } },
                    upsert: true
                }
            });
        }

        if (ojtOps.length > 0) {
            await OJT.bulkWrite(ojtOps);
            // Cleanup: remove documents with shift_number <= 0
            await OJT.deleteMany({ shift_number: { $lte: 0 } });
        }

        // --- 4. CLEAR AND INSERT ROSTER ---
        await Roster.deleteMany(dateFilter);
        if (newAssignments.length > 0) {
            await Roster.insertMany(newAssignments);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Roster for ${date} updated successfully.`,
            count: newAssignments.length
        });
        
    } catch (error) {
        console.error("Roster Update Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to update roster due to server error." 
        }, { status: 500 });
    }
}
