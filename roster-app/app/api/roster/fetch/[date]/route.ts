// app/api/roster/fetch/[date]/route.ts
import { connectToDatabase } from "../../../../../lib/mongoose-client"; 
import Roster from "../../../../../models/roster";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, context: { params: { date: string } }) {
    const { date } = await context.params;

    if (!date) {
        return NextResponse.json({ success: false, message: "Date parameter is missing" }, { status: 400 });
    }

    try {
        await connectToDatabase();

        const startOfDayUTC = new Date(date + 'T00:00:00.000Z');
        const endOfDayUTC = new Date(startOfDayUTC.getTime() + (24 * 60 * 60 * 1000));

        const dateFilter = {
            date: {
                $gte: startOfDayUTC,
                $lt: endOfDayUTC
            }
        };

        // Fetch user_id, shift_type, and location
        const assignments = await Roster.find(dateFilter).select('user_id shift_type location -_id');
        
        // Initialize the data structure the client expects
        const shiftData = {
            date: date,
            East: {
                Morning: [] as string[],
                Afternoon: [] as string[],
                Night: [] as string[],
            },
            West: {
                Morning: [] as string[],
                Afternoon: [] as string[],
                Night: [] as string[],
            }
        };

        if (assignments.length === 0) {
            // If no assignments, return the empty structure but indicate success
            return NextResponse.json({ 
                success: true, 
                message: `No roster data found for ${date}.`,
                data: shiftData
            });
        }

        // Populate the structure
        assignments.forEach(assignment => {
            const { user_id, shift_type, location } = assignment;
            if (location === 'East' || location === 'West') {
                if (shift_type === 'Morning' || shift_type === 'Afternoon' || shift_type === 'Night') {
                    // @ts-expect-error: Dynamic access to shiftData[location][shift_type]
                    if (shiftData[location][shift_type]) {
                        // @ts-expect-error: Dynamic access to shiftData[location][shift_type]
                        shiftData[location][shift_type].push(user_id);
                    }
                }
            }
        });

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