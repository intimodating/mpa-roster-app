// app/api/roster/fetch/[date]/route.ts
import { connectToDatabase } from "../../../../../lib/mongodb"; 
import Roster from "../../../../../models/roster"; // <-- Ensure this path is correct
import { NextResponse } from "next/server";

// We use the GET method for fetching data
export async function GET(req: Request, { params }: { params: { date: string } }) {
    const { date } = params; // The date string (e.g., '2025-10-20')

    if (!date) {
        return NextResponse.json({ success: false, message: "Date parameter is missing" }, { status: 400 });
    }

    try {
        await connectToDatabase();

        // --- 1. Define the 24-hour window in UTC for the given date ---
        // This relies on the convention that dates are stored as UTC midnight (e.g., 2025-10-20T00:00:00.000Z)
        const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000)); // Start of next day

        const dateFilter = {
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC
            }
        };

        // --- 2. Query all roster entries for that day ---
        const assignments = await Roster.find(dateFilter).select('user_id shift_type -_id');
        
        // --- 3. Format the result for the client ---
        // The client needs two clean arrays: dayShiftEmployees and nightShiftEmployees
        const dayShiftEmployees: string[] = [];
        const nightShiftEmployees: string[] = [];
        
        assignments.forEach(assignment => {
            if (assignment.shift_type === 'Day Shift') {
                dayShiftEmployees.push(assignment.user_id);
            } else if (assignment.shift_type === 'Night Shift') {
                nightShiftEmployees.push(assignment.user_id);
            }
            // Ignore 'Leave' or other types for this list
        });
        
        const shiftData = {
            date: date,
            dayShiftEmployees: dayShiftEmployees,
            nightShiftEmployees: nightShiftEmployees
        };

        return NextResponse.json({ 
            success: true, 
            message: `Roster data fetched for ${date}.`,
            data: shiftData
        });
        
    } catch (error) {
        console.error("Roster Fetch Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to fetch roster data." 
        }, { status: 500 });
    }
}