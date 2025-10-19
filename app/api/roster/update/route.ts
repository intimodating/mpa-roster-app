// app/api/roster/update/route.ts
import { connectToDatabase } from "../../../../lib/mongodb"; 
import Roster from "../../../../models/roster";
import { NextResponse } from "next/server";
import User from "../../../../models/users";

// Define the expected structure of the incoming data
interface UpdatePayload {
    date: string; // The date string (e.g., '2025-10-20')
    dayShiftEmployees: string[]; // These are expected to be user_ids (e.g., 'joetay')
    nightShiftEmployees: string[];
}

interface Assignment {
    user_id: string;
    date: Date; // Mongoose Date object
    shift_type: 'Day Shift' | 'Night Shift'; // Union Literal Type
}

export async function POST(req: Request) {
    try {
        const { date, dayShiftEmployees, nightShiftEmployees }: UpdatePayload = await req.json();

        if (!date) {
            return NextResponse.json({ success: false, message: "Date is required" }, { status: 400 });
        }

        await connectToDatabase();

        // 🛑 NEW CHECK 1: Remove duplicates from the input arrays
        const uniqueDayShiftIds = Array.from(new Set(dayShiftEmployees));
        const uniqueNightShiftIds = Array.from(new Set(nightShiftEmployees));

        // 🛑 NEW CHECK 2: Check for employees assigned to BOTH Day and Night shifts
        const daySet = new Set(uniqueDayShiftIds);
        const overlap = uniqueNightShiftIds.filter(id => daySet.has(id));

        if (overlap.length > 0) {
            return NextResponse.json({
                success: false,
                message: `The following User IDs are assigned to BOTH Day and Night shifts: ${overlap.join(', ')}. Please correct the assignment.`,
            }, { status: 400 });
        }

        // 1. VALIDATE: Check all submitted IDs against the User collection
        const allSubmittedIds = Array.from(new Set([...dayShiftEmployees, ...nightShiftEmployees]));

        // Fetch all valid user_ids from the User collection that match the submitted IDs
        const validUsers = await User.find({ 
            user_id: { $in: allSubmittedIds } // Searching by user_id
        }).select('user_id -_id'); 

        const validUserIds = new Set(validUsers.map(u => u.user_id));
        
        // Find any IDs that were submitted but were NOT returned by the database query
        const invalidEmployees = allSubmittedIds.filter(id => !validUserIds.has(id));
        
        // If any IDs are invalid, halt the save and return an error
        if (invalidEmployees.length > 0) {
            return NextResponse.json({ 
                success: false, 
                message: `The following User IDs are not valid employees: ${invalidEmployees.join(', ')}`,
            }, { status: 400 });
        }
        
        // 2. Prepare Date Range for Query
        const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000));

        const dateFilter = {
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC
            }
        };

        // 3. CLEAR: Delete all existing shifts for this 24-hour period
        await Roster.deleteMany(dateFilter);

        // 4. BUILD NEW SHIFT ASSIGNMENTS
        const newAssignments: Assignment[] = []; // Explicitly typed as Assignment[]

        // Helper function to build assignments
        // 🛑 FIX: Explicitly type shiftType with the literal union type
        const buildAssignments = (ids: string[], shiftType: 'Day Shift' | 'Night Shift') => { 
             for (const userId of ids) {
                newAssignments.push({
                    user_id: userId,
                    date: startOfDayUTC,
                    shift_type: shiftType // Now type-safe
                });
            }
        };
        
        buildAssignments(uniqueDayShiftIds, 'Day Shift');
        buildAssignments(uniqueNightShiftIds, 'Night Shift');
        
        // 5. INSERT: Insert all new assignments simultaneously
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