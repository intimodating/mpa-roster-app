import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose-client';
import Competency from '../../../../models/competencies';
import User from '../../../../models/users';
import mongoose from 'mongoose';

const COMPETENCY_COLUMNS = [
    "East Control", "West Control", "VTIS East", "VTIS West", "Keppel Control",
    "Sembawang Control", "Pasir Panjang Control", "Jurong Control", "VTIS Central",
    "Sembawang Control MTC", "Pasir Panjang Control MTC", "VTIC MTC", "PSU",
    "STW(PB)", "GMDSS", "Vista DO"
];

export async function GET() {
    try {
        await connectToDatabase();

        const users = await User.find({ account_type: 'Non-Planner' }).lean();

        if (users.length === 0) {
            return NextResponse.json({ success: true, message: "No non-planner users found to populate competencies for." });
        }

        const competenciesToInsert = [];
        for (const user of users) {
            const numCompetencies = Math.floor(Math.random() * 5) + 1; // 1 to 5 competencies per user
            const shuffledCompetencies = COMPETENCY_COLUMNS.sort(() => 0.5 - Math.random());
            for (let i = 0; i < numCompetencies; i++) {
                competenciesToInsert.push({
                    user_id: user.user_id,
                    console: shuffledCompetencies[i],
                    grade: Math.floor(Math.random() * 9) + 1, // grade 1 to 9
                    date_achieved: new Date()
                });
            }
        }

        if (competenciesToInsert.length > 0) {
            await Competency.deleteMany({}); // Clear existing competencies
            await Competency.insertMany(competenciesToInsert);
            return NextResponse.json({ success: true, message: `${competenciesToInsert.length} competencies have been inserted.` });
        } else {
            return NextResponse.json({ success: true, message: "No competencies to insert." });
        }
    } catch (error) {
        console.error("Error populating competencies:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
