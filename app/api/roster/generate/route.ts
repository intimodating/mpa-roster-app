
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/users";
import { NextResponse } from "next/server";

interface GeneratePayload {
    startDate: string;
    endDate: string;
    gradeCounts: Record<string, number>;
}

export async function POST(req: Request) {
    try {
        const { startDate, endDate, gradeCounts }: GeneratePayload = await req.json();

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, message: "Start and end dates are required" }, { status: 400 });
        }

        await connectToDatabase();

        const nonPlanners = await User.find({ account_type: 'Non-Planner' });

        const generatedRoster: Record<string, { date: string, dayShift: string[], nightShift: string[] }> = {};

        const currentDate = new Date(`${startDate}T12:00:00Z`);
        const lastDate = new Date(`${endDate}T12:00:00Z`);

        const logs: string[] = [];
        while (currentDate <= lastDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            logs.push(`currentDate: ${currentDate.toISOString()}, dateKey: ${dateKey}`);
            generatedRoster[dateKey] = { date: dateKey, dayShift: [], nightShift: [] };

            let availableUsers = [...nonPlanners];

            // Day Shift
            for (const grade in gradeCounts) {
                const requiredCount = gradeCounts[grade];
                const usersOfGrade = availableUsers.filter(u => (u as any).proficiency_grade === parseInt(grade));
                const usersToAssign = usersOfGrade.slice(0, requiredCount);
                generatedRoster[dateKey].dayShift.push(...usersToAssign.map(u => u.user_id as string));
                availableUsers = availableUsers.filter(u => !usersToAssign.find(a => a.user_id === u.user_id));
            }

            // Night Shift
            for (const grade in gradeCounts) {
                const requiredCount = gradeCounts[grade];
                const usersOfGrade = availableUsers.filter(u => (u as any).proficiency_grade === parseInt(grade));
                const usersToAssign = usersOfGrade.slice(0, requiredCount);
                generatedRoster[dateKey].nightShift.push(...usersToAssign.map(u => u.user_id as string));
                availableUsers = availableUsers.filter(u => !usersToAssign.find(a => a.user_id === u.user_id));
            }

            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
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
