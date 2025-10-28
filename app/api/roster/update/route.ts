import { connectToDatabase } from "../../../../lib/mongodb"; 
import Roster from "../../../../models/roster"; 
import User from "../../../../models/users"; 
import { NextResponse } from "next/server";

interface ShiftDetails {
    Morning: string[];
    Afternoon: string[];
    Night: string[];
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
        const allEmployeeIds = [
            ...new Set([
                ...East.Morning, ...East.Afternoon, ...East.Night,
                ...West.Morning, ...West.Afternoon, ...West.Night,
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

        // --- 3. CLEAR: Delete all existing shifts for this 24-hour period ---
        await Roster.deleteMany(dateFilter);

        // --- 4. BUILD NEW SHIFT ASSIGNMENTS ---
        const newAssignments = [];

        const locations = { East, West };
        for (const locationKey of Object.keys(locations)) {
            const location = locationKey as keyof typeof locations;
            const shiftTypes = locations[location];

            for (const shiftTypeKey of Object.keys(shiftTypes)) {
                const shiftType = shiftTypeKey as keyof ShiftDetails;
                const employees = shiftTypes[shiftType];

                for (const employeeId of employees) {
                    newAssignments.push({
                        user_id: employeeId, 
                        date: startOfDayUTC, 
                        shift_type: shiftType, 
                        location: location,
                    });
                }
            }
        }
        
        // --- 5. INSERT: Insert all new assignments simultaneously ---
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