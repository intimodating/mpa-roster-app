import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/users";
import Roster from "../../../../models/roster";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";
import { spawn } from 'child_process';

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

async function generateRosterWithPython(employees: any[], requests: any[], leaveData: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['scripts/scheduler.py']);

        let rosterData = '';
        pythonProcess.stdout.on('data', (data) => {
            rosterData += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
            reject(data.toString());
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const roster = JSON.parse(rosterData);
                    resolve(roster);
                } catch (error) {
                    reject('Failed to parse roster data from Python script.');
                }
            } else {
                reject(`Python script exited with code ${code}`);
            }
        });

        pythonProcess.stdin.write(JSON.stringify({ employees, requests, leaveData }));
        pythonProcess.stdin.end();
    });
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

        const generatedRoster = await generateRosterWithPython(employees, requests, leaveData);

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

        return NextResponse.json({ success: true, roster: generatedRoster, logs: [] });

    } catch (error) {
        console.error("Roster Generation Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to generate roster due to server error." 
        }, { status: 500 });
    }
}