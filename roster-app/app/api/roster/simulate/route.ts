import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Competency from "../../../../models/competencies";
import { NextResponse } from "next/server";

interface WorkerRequirements {
    [location: string]: { 
      [key: string]: number; 
    };
  }

interface SimulatePayload {
    startDate: string;
    endDate: string;
    workerRequirements: WorkerRequirements;
    shiftPattern: string[];
}

interface Employee {
    id: string;
    proficiency_grade: number;
    team?: number;
    competencies?: string[];
}

interface RequestItem {
    date: string;
    location: string;
    shiftType: 'Morning' | 'Afternoon' | 'Night';
    required_competencies?: WorkerRequirements[string];
}

async function callSimulationService(
    employees: Employee[], 
    requests: RequestItem[], 
    shiftPattern: string[],
    ojtData: Record<string, Record<string, Record<string, string>>>
) {
    let rosterGeneratorUrl: string | undefined;

    if (process.env.NODE_ENV === 'production') {
        rosterGeneratorUrl = process.env.ROSTER_GENERATOR_URL;
    } else {
        rosterGeneratorUrl = 'http://localhost:5000/generate-roster';
    }

    try {
        const response = await fetch(rosterGeneratorUrl!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                employees, 
                requests, 
                shiftPattern, 
                schedulingMode: 'simulation',
                leaveData: {}, // Simulation assumes everyone is available for the test
                ojtData
            }),
            signal: AbortSignal.timeout(300000)
        });

        return await response.json();
    } catch (error) {
        console.error("Simulation service error:", error);
        throw error;
    }
}

export async function POST(req: Request) {
    try {
        const { startDate, endDate, workerRequirements, shiftPattern }: SimulatePayload = await req.json();

        if (!startDate || !endDate || !shiftPattern) {
            return NextResponse.json({ success: false, message: "Dates and pattern are required" }, { status: 400 });
        }

        await connectToDatabase();

        const schedulableEmployees = await User.find({ account_type: 'Non-Planner' })
            .select('user_id proficiency_grade team -_id')
            .sort({ user_id: 1 })
            .lean();
        
        const userIds = schedulableEmployees.map(u => u.user_id);
        const allCompetencies = await Competency.find({ user_id: { $in: userIds } }).lean();
        
        // Fetch OJT assignments for the period
        const start = new Date(`${startDate}T00:00:00Z`);
        const end = new Date(`${endDate}T23:59:59Z`);
        
        const Roster = (await import("../../../../models/roster")).default;
        const ojtAssignments = await Roster.find({
            date: { $gte: start, $lte: end },
            is_ojt: true
        }).lean();

        const ojtData: Record<string, Record<string, Record<string, string>>> = {};
        ojtAssignments.forEach((ojt: any) => {
            const dateKey = ojt.date.toISOString().split('T')[0];
            if (!ojtData[dateKey]) ojtData[dateKey] = {};
            if (!ojtData[dateKey][ojt.user_id]) ojtData[dateKey][ojt.user_id] = {};
            ojtData[dateKey][ojt.user_id][ojt.shift_type] = ojt.assigned_console;
        });

        const competencyMap: Record<string, string[]> = {};
        allCompetencies.forEach((comp: any) => {
            if (!competencyMap[comp.user_id]) competencyMap[comp.user_id] = [];
            competencyMap[comp.user_id].push(comp.console);
        });

        const employees = schedulableEmployees.map((user: any) => ({
            id: user.user_id, 
            proficiency_grade: user.proficiency_grade,
            team: user.team,
            competencies: competencyMap[user.user_id] || []
        }));

        const shiftMapping: Record<string, string> = {
            "M": "Morning", "Morning": "Morning",
            "A": "Afternoon", "Afternoon": "Afternoon",
            "N": "Night", "Night": "Night"
        };
        const shiftsInPattern = new Set(shiftPattern.map(s => shiftMapping[s]).filter(Boolean));
        
        const requests = [];
        const currentDate = new Date(`${startDate}T12:00:00Z`);
        const lastDate = new Date(`${endDate}T12:00:00Z`);
        while (currentDate <= lastDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            for (const location in workerRequirements) {
                for (const shiftType of ['Morning', 'Afternoon', 'Night']) {
                    if (shiftsInPattern.has(shiftType)) {
                        requests.push({
                            date: dateKey,
                            location,
                            shiftType: shiftType as any,
                            required_competencies: workerRequirements[location]
                        });
                    }
                }
            }
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        const result = await callSimulationService(employees, requests, shiftPattern, ojtData);

        if (result.error) {
            return NextResponse.json({ success: false, message: result.error }, { status: 400 });
        }

        return NextResponse.json({ success: true, roster: result });

    } catch (error) {
        console.error("Simulation API Error:", error);
        return NextResponse.json({ success: false, message: "Failed to simulate roster." }, { status: 500 });
    }
}
