// app/api/roster/update/route.ts
import { connectToDatabase } from "../../../../lib/mongodb"; 
import Roster from "../../../../models/roster"; // <-- Ensure this path is correct
import { NextResponse } from "next/server";

// Define the expected structure of the incoming data
interface UpdatePayload {
    date: string; // The date string (e.g., '2025-10-20')
    dayShiftEmployees: string[];
    nightShiftEmployees: string[];
}

export async function POST(req: Request) {
    try {
        const { date, dayShiftEmployees, nightShiftEmployees }: UpdatePayload = await req.json();

        if (!date) {
            return NextResponse.json({ success: false, message: "Date is required" }, { status: 400 });
        }

        await connectToDatabase();

        // --- 1. Prepare Date Range for Query (Crucial for correct date handling) ---
        // Convert the client's date string (e.g., '2025-10-20') to a UTC date object
        // This ensures the date is treated as the start of the day in UTC for querying.
        const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000)); // Start of next day

        const dateFilter = {
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC
            }
        };

        // --- 2. CLEAR: Delete all existing shifts for this 24-hour period ---
        // This simplifies the logic by ensuring no old shifts remain for the day
        await Roster.deleteMany(dateFilter);

        // --- 3. BUILD NEW SHIFT ASSIGNMENTS (Array of new documents) ---
        const newAssignments = [];

        // Insert Day Shift assignments
        for (const employeeName of dayShiftEmployees) {
            // NOTE: You should ideally look up the user_id from the employeeName here
            // For now, we'll assume the employeeName IS the user_id or a unique identifier.
            newAssignments.push({
                user_id: employeeName, 
                date: startOfDayUTC, // Use the correct UTC date
                shift_type: 'Day Shift'
            });
        }

        // Insert Night Shift assignments
        for (const employeeName of nightShiftEmployees) {
            newAssignments.push({
                user_id: employeeName, 
                date: startOfDayUTC, // Use the correct UTC date
                shift_type: 'Night Shift'
            });
        }
        
        // --- 4. INSERT: Insert all new assignments simultaneously ---
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