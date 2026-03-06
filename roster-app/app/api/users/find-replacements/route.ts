import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster";
import Leave from "../../../../models/leaves";
import Competency from "../../../../models/competencies";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { date, min_proficiency_grade, required_console } = await req.json();

        if (!date || min_proficiency_grade === undefined) {
            return NextResponse.json({ success: false, message: "Missing date or min_proficiency_grade" }, { status: 400 });
        }

        await connectToDatabase();

        // 1. Get all potential users based on proficiency and account type
        let potentialCandidates = await User.find({
            proficiency_grade: { $gte: min_proficiency_grade },
            account_type: 'Non-Planner'
        }).select('user_id proficiency_grade reserve_deploy_count -_id').lean();

        // 2. If a specific console is required, filter by competency
        if (required_console) {
            const certifiedUsers = await Competency.find({
                console: required_console
            }).select('user_id -_id').lean();
            
            const certifiedUserIds = new Set(certifiedUsers.map(c => c.user_id));
            potentialCandidates = potentialCandidates.filter(c => certifiedUserIds.has(c.user_id));
        }

        // 3. Get users on shift on that date
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const onShiftUsers = await Roster.find({
            date: { $gte: startOfDay, $lt: endOfDay }
        }).select('user_id -_id');
        const onShiftUserIds = new Set(onShiftUsers.map(u => u.user_id));

        // 4. Get users on approved leave on that date
        const onLeaveUsers = await Leave.find({
            date: { $gte: startOfDay, $lt: endOfDay },
            status: 'Approved'
        }).select('user_id -_id');
        const onLeaveUserIds = new Set(onLeaveUsers.map(u => u.user_id));

        // 5. Filter candidates
        const availableCandidates = potentialCandidates.filter(c => 
            !onShiftUserIds.has(c.user_id) && !onLeaveUserIds.has(c.user_id)
        );

        // 5. Sort candidates by proficiency_grade ascending, then reserve_deploy_count ascending
        availableCandidates.sort((a, b) => {
            if (a.proficiency_grade !== b.proficiency_grade) {
                return a.proficiency_grade - b.proficiency_grade;
            }
            return a.reserve_deploy_count - b.reserve_deploy_count;
        });

        // Return all sorted available candidates
        const selectedCandidates = availableCandidates;

        return NextResponse.json({ success: true, data: selectedCandidates });

    } catch (error) {
        console.error("Error finding replacements:", error);
        return NextResponse.json({ success: false, message: "Failed to find replacements" }, { status: 500 });
    }
}
