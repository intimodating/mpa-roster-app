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
    schedulingMode: 'individual' | 'team'; // Add this line
}

interface Employee {
    id: string;
    proficiency_grade: number;
    team?: number; // Add this line
}

interface RequestItem {
    date: string;
    location: string;
    shiftType: 'Morning' | 'Afternoon' | 'Night';
    required_proficiencies: WorkerRequirements[string];
}

type GeneratedRoster = {
    [date: string]: {
        [location: string]: {
            [shiftType: string]: string[];
        };
    };
};

interface PythonRosterResult {
    [date: string]: {
        [location: string]: {
            [shiftType: string]: string[];
        };
    };
}

interface PythonValidationError {
    error: string;
    details: Array<{ date: string; message: string; team: number }>;
}

// Add this interface
interface MongooseUserDocument {
    user_id: string;
    proficiency_grade: number;
    account_type: string;
    team?: number; // Make it optional since some users might not have it initially
}

// Type guard function
function isPythonValidationError(response: any): response is PythonValidationError {
    return (response as PythonValidationError).error !== undefined;
}


async function generateRosterWithPython(
    employees: Employee[], 
    requests: RequestItem[], 
    leaveData: Record<string, string[]>,
    schedulingMode: 'individual' | 'team' // Add this
): Promise<PythonRosterResult | PythonValidationError> {
    let rosterGeneratorUrl: string | undefined;

    if (process.env.NODE_ENV === 'production') {
        rosterGeneratorUrl = process.env.ROSTER_GENERATOR_URL;
        if (!rosterGeneratorUrl) {
            throw new Error("ROSTER_GENERATOR_URL environment variable is not set for production.");
        }
    } else {
        rosterGeneratorUrl = 'http://localhost:5000/generate-roster';
    }

    console.log(`[${process.env.NODE_ENV}] Calling roster generator service at:`, rosterGeneratorUrl);

    try {
        const response = await fetch(rosterGeneratorUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ employees, requests, leaveData, schedulingMode }), // Pass schedulingMode
            signal: AbortSignal.timeout(300000) // 5 minutes
        });

        const data = await response.json(); // Read response body as JSON

        if (!response.ok) {
            // If the Python service explicitly returns a validation error,
            // we should pass it along.
            if (data && data.error) { // Changed to check for 'error' key
                return data as PythonValidationError; // Return the validation error directly
            }
            const errorBody = JSON.stringify(data); // In case it's a generic error JSON
            console.error("Roster generator service responded with an error:", response.status, errorBody);
            throw new Error(`Roster generator service failed with status ${response.status}: ${errorBody}`);
        }

        return data as PythonRosterResult; // Cast successful response
    } catch (error) {
        console.error("Failed to fetch from roster generator service:", error);
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const { startDate, endDate, workerRequirements, schedulingMode }: GeneratePayload = await req.json(); // Receive schedulingMode

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, message: "Start and end dates are required" }, { status: 400 });
        }

        await connectToDatabase();

        // Employees for the scheduler need to include their team for team-based scheduling
        // Current logic only fetches non-planners. This might need to be adjusted if planners can be scheduled.
        // Assuming only non-planners are schedulable.
        const schedulableEmployees = await User.find({ account_type: 'Non-Planner' }).select('user_id proficiency_grade team account_type -_id').lean() as MongooseUserDocument[];
        
        const employees = schedulableEmployees.map((user: MongooseUserDocument) => ({
            id: user.user_id, 
            proficiency_grade: user.proficiency_grade,
            team: user.team // Include team for team-based scheduling
        }));

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

        const pythonResponse = await generateRosterWithPython(employees, requests, leaveData, schedulingMode); // Pass schedulingMode

        if (isPythonValidationError(pythonResponse)) {
            // Return validation error directly from here
            return NextResponse.json({ success: false, ...pythonResponse }, { status: 400 });
        }

        // The pythonResponse is now the roster directly
        const generatedRoster = pythonResponse as PythonRosterResult;

        // Clear existing roster for the date range
        await Roster.deleteMany({
            date: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            },
        });

        // Save new roster entries
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

        return NextResponse.json({ success: true, roster: generatedRoster }); // Removed 'logs' here as Python service only returns roster or error

    } catch (error) {
        console.error("Roster Generation Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to generate roster due to server error." 
        }, { status: 500 });
    }
}