import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../lib/mongoose-client';
import User from '../../../models/users';
import Competency from '../../../models/competencies'; // Import the new Competency model

// Define the fixed order of competency columns
const COMPETENCY_COLUMNS = [
    "East Control", "West Control", "VTIS East", "VTIS West", "Keppel Control",
    "Sembawang Control", "Pasir Panjang Control", "Jurong Control", "VTIS Central",
    "Sembawang Control MTC", "Pasir Panjang Control MTC", "VTIC MTC", "PSU",
    "STW(PB)", "GMDSS", "Vista DO"
];

export async function GET() {
    try {
        await connectToDatabase();

        // Fetch all non-planner users, sorted by proficiency_grade
        const users = await User.find({ account_type: 'Non-Planner' })
                                .select('user_id name proficiency_grade team') // Re-added 'name'
                                .sort({ proficiency_grade: 1, user_id: 1 }) // Sort by grade then user_id
                                .lean(); // Get plain JavaScript objects

        // Fetch all competencies
        const allCompetencies = await Competency.find({}).lean();

        // Map competencies for quick lookup: { user_id: { console_name: { grade: number, date_achieved: Date } } }
        const userCompetencyMap: Record<string, Record<string, { grade: number; date_achieved: Date }>> = {};
        allCompetencies.forEach(comp => {
            if (!userCompetencyMap[comp.user_id]) {
                userCompetencyMap[comp.user_id] = {};
            }
            userCompetencyMap[comp.user_id][comp.console] = {
                grade: comp.grade,
                date_achieved: comp.date_achieved,
            };
        });

        // Structure the data for the 2D table
        const tableData: Array<any> = [];
        const teams: Record<number, Array<any>> = {}; // To group users by team

        for (const user of users) {
            // Ensure user has a team, or assign a default/handle
            const teamId = user.team || 0; // Default to team 0 if not specified
            
            if (!teams[teamId]) {
                teams[teamId] = [];
            }

            const rowData: Record<string, any> = {
                user_id: user.user_id,
                name: user.name, // Re-added 'name'
                proficiency_grade: user.proficiency_grade,
                team: user.team,
            };

            for (const col of COMPETENCY_COLUMNS) {
                rowData[col] = userCompetencyMap[user.user_id]?.[col] || null;
            }
            teams[teamId].push(rowData);
        }

        // Sort teams and then users within teams
        const sortedTeamIds = Object.keys(teams).map(Number).sort((a, b) => a - b);
        const finalTableData: Array<any> = [];
        for (const teamId of sortedTeamIds) {
            // Sort users within each team by proficiency_grade then user_id
            teams[teamId].sort((a, b) => {
                if (a.proficiency_grade !== b.proficiency_grade) {
                    return a.proficiency_grade - b.proficiency_grade;
                }
                return a.user_id.localeCompare(b.user_id);
            });
            finalTableData.push(...teams[teamId]);
        }

        return NextResponse.json({ 
            success: true, 
            columns: ['user_id', 'name', 'proficiency_grade', 'team', ...COMPETENCY_COLUMNS], // Re-added 'name'
            data: finalTableData 
        });

    } catch (error) {
        console.error("Error fetching staff competencies:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
