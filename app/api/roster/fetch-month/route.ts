import { connectToDatabase } from "../../../../lib/mongoose-client"; 
import Roster from "../../../../models/roster"; 
import { NextResponse } from "next/server";

interface ShiftData {
    Morning: string[];
    Afternoon: string[];
    Night: string[];
}

interface LocationShiftData {
    East: ShiftData;
    West: ShiftData;
}

type RosterMap = Record<string, LocationShiftData>;

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
        // Select the fields needed for the calendar view and reformatting, including 'location'
        const assignments = await Roster.find(dateFilter).select('user_id shift_type date location -_id');
        
        // 2. Reformat the raw assignments into the RosterMap structure
        const rosterMap: RosterMap = {};

        assignments.forEach(assignment => {
            // Convert the stored UTC Date object back to the 'YYYY-MM-DD' string key (UTC date part)
            const dateKey = assignment.date.toISOString().split('T')[0];
            
            if (!rosterMap[dateKey]) {
                rosterMap[dateKey] = {
                    East: { Morning: [], Afternoon: [], Night: [] },
                    West: { Morning: [], Afternoon: [], Night: [] },
                };
            }

            const location = assignment.location as keyof LocationShiftData;
            const shiftType = assignment.shift_type as keyof ShiftData;

            if (location && (shiftType === 'Morning' || shiftType === 'Afternoon' || shiftType === 'Night') && rosterMap[dateKey][location]) {
                rosterMap[dateKey][location][shiftType].push(assignment.user_id);
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