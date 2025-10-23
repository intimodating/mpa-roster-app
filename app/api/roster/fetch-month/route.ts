// app/api/roster/fetch-month/route.ts
import { connectToDatabase } from "../../../../lib/mongodb"; 
import Roster from "../../../../models/roster"; 
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    // Get URL search parameters (startDate and endDate)
    const url = new URL(req.url);
    const startDateStr = url.searchParams.get('startDate');
    const endDateStr = url.searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
        return NextResponse.json({ 
            success: false, 
            message: "startDate and endDate parameters are required." 
        }, { status: 400 });
    }

    try {
        await connectToDatabase();

        // Convert string parameters to UTC Date objects for Mongoose query
        // The dates should already be correctly formatted as UTC midnight by the frontend
        const startDateUTC = new Date(startDateStr);
        const endDateUTC = new Date(endDateStr);

        const dateFilter = {
            date: {
                $gte: startDateUTC,
                $lt: endDateUTC
            }
        };

        // 1. Fetch all roster entries in the date range
        // Only select the fields needed for the calendar view and reformatting
        const assignments = await Roster.find(dateFilter).select('user_id shift_type date -_id');
        
        // 2. Reformat the raw assignments into the RosterMap structure { 'YYYY-MM-DD': { ... } }
        const rosterMap: Record<string, { date: string, dayShiftEmployees: string[], nightShiftEmployees: string[] }> = {};

        assignments.forEach(assignment => {
            // Convert the stored UTC Date object back to the 'YYYY-MM-DD' string key (UTC date part)
            const dateKey = assignment.date.toISOString().split('T')[0];
            
            if (!rosterMap[dateKey]) {
                rosterMap[dateKey] = { date: dateKey, dayShiftEmployees: [], nightShiftEmployees: [] };
            }

            if (assignment.shift_type === 'Day Shift') {
                rosterMap[dateKey].dayShiftEmployees.push(assignment.user_id);
            } else if (assignment.shift_type === 'Night Shift') {
                rosterMap[dateKey].nightShiftEmployees.push(assignment.user_id);
            }
        });
        
        return NextResponse.json({ 
            success: true, 
            message: `Roster data for ${startDateStr.split('T')[0]} to ${endDateStr.split('T')[0]} fetched.`,
            data: rosterMap
        });
        
    } catch (error) {
        console.error("Month Fetch Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to fetch month roster data." 
        }, { status: 500 });
    }
}