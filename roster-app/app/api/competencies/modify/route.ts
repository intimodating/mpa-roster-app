import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose-client';
import Competency from '../../../../models/competencies'; // Import the Competency model

export async function POST(req: Request) {
    try {
        const { user_id, console, grade, date_achieved } = await req.json();

        if (!user_id || !console || grade === undefined || !date_achieved) {
            return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
        }

        // Validate grade is a number
        if (typeof grade !== 'number' || grade < 1 || grade > 9) {
            return NextResponse.json({ success: false, message: "Grade must be a number between 1 and 9." }, { status: 400 });
        }

        // Validate date_achieved format
        if (isNaN(new Date(date_achieved).getTime())) {
            return NextResponse.json({ success: false, message: "Invalid date_achieved format." }, { status: 400 });
        }

        await connectToDatabase();

        const updatedCompetency = await Competency.findOneAndUpdate(
            { user_id: user_id, console: console }, // Find a document with this user_id and console
            { grade: grade, date_achieved: new Date(date_achieved) }, // Update these fields
            { upsert: true, new: true, setDefaultsOnInsert: true } // Create if not exists, return new doc
        );

        return NextResponse.json({ success: true, competency: updatedCompetency });

    } catch (error) {
        console.error("Error modifying competency:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
