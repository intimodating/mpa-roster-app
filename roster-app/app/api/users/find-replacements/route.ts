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

        // 3. Get roster data for that date to identify Reserves and OFFs
        const startOfDay = new Date(date + 'T00:00:00.000Z');
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        const rosterAssignments = await Roster.find({
            date: { $gte: startOfDay, $lt: endOfDay }
        }).select('user_id shift_type assigned_console -_id').lean();

        const rosterMap: Record<string, { shift_type: string, assigned_console: string }> = {};
        rosterAssignments.forEach((a: any) => {
            rosterMap[a.user_id] = { shift_type: a.shift_type, assigned_console: a.assigned_console };
        });

        // 4. Get users on approved leave on that date
        const onLeaveUsers = await Leave.find({
            date: { $gte: startOfDay, $lt: endOfDay },
            status: 'Approved'
        }).select('user_id -_id').lean();
        const onLeaveUserIds = new Set(onLeaveUsers.map((u: any) => u.user_id));

        // 5. Categorize candidates
        const categorized: Record<string, any[]> = {
            "Reserve Morning": [],
            "Reserve Afternoon": [],
            "Reserve Night": [],
            "OFF": []
        };

        potentialCandidates.forEach((c: any) => {
            if (onLeaveUserIds.has(c.user_id)) return;

            const rosterInfo = rosterMap[c.user_id];
            if (!rosterInfo) {
                // If not in roster at all, assume they are OFF (fallback)
                categorized["OFF"].push(c);
                return;
            }

            if (rosterInfo.assigned_console === 'Reserve') {
                const catName = `Reserve ${rosterInfo.shift_type}`;
                if (categorized[catName]) {
                    categorized[catName].push(c);
                }
            } else if (rosterInfo.assigned_console === 'OFF') {
                categorized["OFF"].push(c);
            }
            // Note: People already assigned to a console (not Reserve/OFF) are excluded
        });

        // 6. Sort within each category
        const sortFn = (a: any, b: any) => {
            if (a.proficiency_grade !== b.proficiency_grade) {
                return a.proficiency_grade - b.proficiency_grade;
            }
            return (a.reserve_deploy_count || 0) - (b.reserve_deploy_count || 0);
        };

        Object.keys(categorized).forEach(key => {
            categorized[key].sort(sortFn);
        });

        return NextResponse.json({ success: true, data: categorized });

    } catch (error) {
        console.error("Error finding replacements:", error);
        return NextResponse.json({ success: false, message: "Failed to find replacements" }, { status: 500 });
    }
}
