import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster";
import Leave from "../../../../models/leaves";
import Competency from "../../../../models/competencies";
import { NextResponse } from "next/server";

interface WorkerRequirements {
    [location: string]: { 
      [key: string]: number; // Can be proficiencyGrade or competencyName
    };
  }

interface GeneratePayload {
    startDate: string;
    endDate: string;
    workerRequirements: WorkerRequirements;
    schedulingMode: 'individual' | 'team' | 'competency'; // Updated
}

interface Employee {
    id: string;
    proficiency_grade: number;
    team?: number;
    competencies?: string[]; // Added
}

interface RequestItem {
    date: string;
    location: string;
    shiftType: 'Morning' | 'Afternoon' | 'Night';
    required_proficiencies?: WorkerRequirements[string];
    required_competencies?: WorkerRequirements[string]; // Added
}

type GeneratedRoster = {
    [date: string]: {
        [location: string]: {
            [shiftType: string]: (string | { user_id: string; assigned_console?: string })[];
        };
    };
};

interface PythonRosterResult {
    [date: string]: {
        [location: string]: {
            [shiftType: string]: (string | { user_id: string; assigned_console?: string })[];
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
    schedulingMode: 'individual' | 'team' | 'competency' // Added 'competency'
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
        console.log(`[Generate] Found ${schedulableEmployees.length} schedulable employees.`);
        
        // Fetch competencies for all schedulable employees
        const userIds = schedulableEmployees.map(u => u.user_id);
        const allCompetencies = await Competency.find({ user_id: { $in: userIds } }).lean();
        console.log(`[Generate] Fetched ${allCompetencies.length} competency records.`);
        
        const competencyMap: Record<string, string[]> = {};
        allCompetencies.forEach((comp: any) => {
            if (!competencyMap[comp.user_id]) {
                competencyMap[comp.user_id] = [];
            }
            competencyMap[comp.user_id].push(comp.console);
        });

        const employees = schedulableEmployees.map((user: MongooseUserDocument) => ({
            id: user.user_id, 
            proficiency_grade: user.proficiency_grade,
            team: user.team,
            competencies: competencyMap[user.user_id] || [] // Include competencies
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
                    const req: RequestItem = {
                        date: dateKey,
                        location,
                        shiftType: shiftType as 'Morning' | 'Afternoon' | 'Night',
                    };

                    if (schedulingMode === 'competency') {
                        req.required_competencies = workerRequirements[location];
                    } else {
                        req.required_proficiencies = workerRequirements[location];
                    }
                    requests.push(req);
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
                    for (const entry of generatedRoster[date][location][shiftType]) {
                        const isCompetencyEntry = typeof entry === 'object' && entry !== null && 'user_id' in entry;
                        const userId = isCompetencyEntry ? (entry as any).user_id : entry;
                        const assignedConsole = isCompetencyEntry ? (entry as any).assigned_console : undefined;

                        const newRosterEntry = new Roster({
                            user_id: userId,
                            date: new Date(date),
                            shift_type: shiftType,
                            location: location,
                            assigned_console: assignedConsole,
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