import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

interface WorkerRequirements {
    [location: string]: { 
      [proficiencyGrade: string]: number; 
    };
  }

interface GeneratePayload {
    startDate: string;
    endDate: string;
    workerRequirements: WorkerRequirements;
}

interface Employee {
    id: string;
    proficiency_grade: number;
}

interface RequestItem {
    date: string;
    location: string;
    shiftType: 'Morning' | 'Afternoon' | 'Night';
    required_proficiencies: WorkerRequirements[string];
}

interface PythonRosterResult {
    roster: Record<string, any>;
    logs: string[];
}

async function generateRosterWithPython(employees: Employee[], requests: RequestItem[], leaveData: Record<string, string[]>): Promise<PythonRosterResult> {
    const rosterGeneratorUrl = process.env.ROSTER_GENERATOR_URL;

    if (!rosterGeneratorUrl) {
        throw new Error("ROSTER_GENERATOR_URL environment variable is not set.");
    }

    console.log("Calling roster generator service at:", rosterGeneratorUrl);

    try {
        const response = await fetch(rosterGeneratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employees, requests, leaveData }),
            // It's a good practice to set a timeout for external calls.
            // In Node.js 18+, you can use AbortSignal.timeout()
            // signal: AbortSignal.timeout(60000) // 60 seconds
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Roster generator service responded with an error:", response.status, errorBody);
            throw new Error(`Roster generator service failed with status ${response.status}: ${errorBody}`);
        }

        const roster = await response.json();
        
        // The new service doesn't return stderr logs directly, so we return an empty array.
        // Logs can be checked directly on the Cloud Run service instance.
        return { roster, logs: ["Roster generated via Cloud Run service. Check service logs for details."] };

    } catch (error) {
        console.error("Failed to fetch from roster generator service:", error);
        // Re-throw the error to be caught by the main POST handler
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const { startDate, endDate, workerRequirements }: GeneratePayload = await req.json();

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, message: "Start and end dates are required" }, { status: 400 });
        }

        await connectToDatabase();

        const nonPlanners = await User.find({ account_type: 'Non-Planner' });
        const employees = nonPlanners.map(user => ({ id: user.user_id, proficiency_grade: user.proficiency_grade }));

        const leaves = await Leave.find({ status: 'Approved' });
        const leaveData: Record<string, string[]> = {};
        for (const leave of leaves) {
            if (!leaveData[leave.user_id]) {
                leaveData[leave.user_id] = [];
            }
            leaveData[leave.user_id].push(leave.date.toISOString().split('T')[0]);
        }

        const requests = [];
        const currentDate = new Date(`${startDate}T12:00:00Z`);
        const lastDate = new Date(`${endDate}T12:00:00Z`);
        while (currentDate <= lastDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            for (const location in workerRequirements) {
                for (const shiftType of ['Morning', 'Afternoon', 'Night']) {
                    requests.push({
                        date: dateKey,
                        location,
                        shiftType: shiftType as 'Morning' | 'Afternoon' | 'Night',
                        required_proficiencies: workerRequirements[location],
                    });
                }
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        const { roster: generatedRoster, logs } = await generateRosterWithPython(employees, requests, leaveData);

        await Roster.deleteMany({
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            },
        });

        for (const date in generatedRoster) {
            for (const location in generatedRoster[date]) {
                for (const shiftType in generatedRoster[date][location]) {
                    for (const userId of generatedRoster[date][location][shiftType]) {
                        const newRosterEntry = new Roster({
                            user_id: userId,
                            date: new Date(date),
                            shift_type: shiftType,
                            location: location,
                        });
                        await newRosterEntry.save();
                    }
                }
            }
        }

        return NextResponse.json({ success: true, roster: generatedRoster, logs });

    } catch (error) {
        console.error("Roster Generation Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to generate roster due to server error." 
        }, { status: 500 });
    }
}