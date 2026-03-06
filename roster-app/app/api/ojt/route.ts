import { NextResponse } from 'next/server';
import { connectToDatabase, User } from '../../../lib/mongoose-client';
import OJT from '../../../models/ojt';

const COMPETENCY_COLUMNS = [
    "East Control", "West Control", "Keppel", "Cruisebay",
    "VTIS East", "VTIS West", "VTIS Central", "Sembawang Control",
    "Jurong Control", "Pasir Panjang Control", "Sembawang MTC",
    "Pasir Panjang MTC", "VTIS MTC", "PSU", "Temasek MTC",
    "GMDSS", "STW (PB)", "Vista DO/ Sensitive Vessels",
    "STW (TU)", "Changi DO", "Watch IC Console",
    "Proactive"
];

export async function GET() {
    try {
        await connectToDatabase();

        const users = await User.find({ account_type: 'Non-Planner' })
                                .select('user_id name proficiency_grade team')
                                .sort({ proficiency_grade: 1, user_id: 1 })
                                .lean();

        const allOJT = await OJT.find({}).lean();

        const userOJTMap: Record<string, Record<string, number>> = {};
        allOJT.forEach(ojt => {
            if (!userOJTMap[ojt.user_id]) {
                userOJTMap[ojt.user_id] = {};
            }
            userOJTMap[ojt.user_id][ojt.console] = ojt.shift_number;
        });

        const tableData: Array<any> = [];
        for (const user of users) {
            const rowData: Record<string, any> = {
                user_id: user.user_id,
                name: user.name,
                proficiency_grade: user.proficiency_grade,
                team: user.team,
            };

            for (const col of COMPETENCY_COLUMNS) {
                rowData[col] = userOJTMap[user.user_id]?.[col] || null;
            }
            tableData.push(rowData);
        }

        return NextResponse.json({ 
            success: true, 
            columns: ['user_id', 'name', 'proficiency_grade', 'team', ...COMPETENCY_COLUMNS],
            data: tableData 
        });

    } catch (error) {
        console.error("Error fetching OJT data:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
