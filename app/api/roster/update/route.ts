// app/api/roster/update/route.ts
import { connectToDatabase } from "../../../../lib/mongodb"; 
import Roster from "../../../../models/roster";
import { NextResponse } from "next/server";
import User from "../../../../models/users";

// Define the expected structure of the incoming data
interface UpdatePayload {
    date: string; 
    dayShiftEmployees: string[]; 
    nightShiftEmployees: string[];
}

interface Assignment {
    user_id: string;
    date: Date;
    shift_type: 'Day Shift' | 'Night Shift';
}

export async function POST(req: Request) {
    try {
        const { date, dayShiftEmployees, nightShiftEmployees }: UpdatePayload = await req.json();

        if (!date) {
            return NextResponse.json({ success: false, message: "Date is required" }, { status: 400 });
        }

        await connectToDatabase();

        // 1. NORMALIZE INPUT: Convert all incoming IDs to UPPERCASE for consistent comparison
        const normalizedDayShiftIds = Array.from(new Set(
            dayShiftEmployees.map(id => id.trim().toUpperCase())
        ));
        const normalizedNightShiftIds = Array.from(new Set(
            nightShiftEmployees.map(id => id.trim().toUpperCase())
        ));

        // 2. CHECK for OVERLAP (Employee assigned to BOTH Day and Night shifts)
        const daySet = new Set(normalizedDayShiftIds);
        const overlap = normalizedNightShiftIds.filter(id => daySet.has(id));

        if (overlap.length > 0) {
            return NextResponse.json({
                success: false,
                message: `The following User IDs are assigned to BOTH Day and Night shifts: ${overlap.join(', ')}. Please correct the assignment.`,
            }, { status: 400 });
        }

        // 3. VALIDATE: Check all submitted IDs against the User collection (Case-Insensitive)
        const allNormalizedSubmittedIds = Array.from(new Set([
            ...normalizedDayShiftIds, 
            ...normalizedNightShiftIds
        ]));
        
        // Fetch all valid user_ids from the User collection that match the submitted IDs
        const validUsers = await User.find({
            // Query using the normalized IDs
            user_id: { $in: allNormalizedSubmittedIds }
        })
        .select('user_id -_id')
        // 🛑 FIX: Apply Collation to force case-insensitive comparison (strength: 2)
        .collation({ locale: 'en', strength: 2 }); 

        // Normalize the retrieved database IDs (optional, but ensures robust check)
        const validUserIds = new Set(validUsers.map(u => u.user_id.toUpperCase()));
        
        // Find any submitted IDs that were NOT returned by the database query
        const invalidEmployees: string[] = [];
        for (const id of allNormalizedSubmittedIds) {
            if (!validUserIds.has(id)) {
                invalidEmployees.push(id);
            }
        }
        
        // If any IDs are invalid, halt the save and return an error
        if (invalidEmployees.length > 0) {
            return NextResponse.json({ 
                success: false, 
                message: `The following User IDs are not valid employees: ${invalidEmployees.join(', ')}`,
            }, { status: 400 });
        }
        
        // 4. Prepare Date Range for Query
        const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000));

        const dateFilter = {
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC
            }
        };

        // 5. CLEAR: Delete all existing shifts for this 24-hour period
        await Roster.deleteMany(dateFilter);

        // 6. BUILD NEW SHIFT ASSIGNMENTS
        const newAssignments: Assignment[] = []; 

        const buildAssignments = (ids: string[], shiftType: 'Day Shift' | 'Night Shift') => { 
             for (const userId of ids) {
                 newAssignments.push({
                     // Use the normalized IDs for saving to the Roster collection
                     user_id: userId, 
                     date: startOfDayUTC,
                     shift_type: shiftType
                 });
             }
        };
        
        // Use the normalized IDs for building assignments
        buildAssignments(normalizedDayShiftIds, 'Day Shift');
        buildAssignments(normalizedNightShiftIds, 'Night Shift');
        
        // 7. INSERT: Insert all new assignments simultaneously
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