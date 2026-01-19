import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongoose-client';
import Competency from '../../../../../models/competencies';

export async function GET(req: Request, { params }: { params: { user_id: string } }) {
    try {
        const { user_id } = await params;

        if (!user_id) {
            return NextResponse.json({ success: false, message: "User ID is required." }, { status: 400 });
        }

        await connectToDatabase();

        const userCompetencies = await Competency.find({ user_id: user_id }).select('console grade date_achieved -_id').lean();

        return NextResponse.json({ success: true, competencies: userCompetencies });

    } catch (error) {
        console.error(`Error fetching competencies for user:`, error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
