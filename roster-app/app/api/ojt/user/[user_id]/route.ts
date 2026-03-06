import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../../lib/mongoose-client';
import OJT from '../../../../../models/ojt';

export async function GET(req: Request, context: { params: { user_id: string } }) {
    try {
        const { user_id } = await context.params;

        if (!user_id) {
            return NextResponse.json({ success: false, message: "Missing user_id" }, { status: 400 });
        }

        await connectToDatabase();

        const ojts = await OJT.find({ user_id: user_id }).select('console shift_number -_id').lean();

        return NextResponse.json({ 
            success: true, 
            ojts: ojts 
        });

    } catch (error) {
        console.error("Error fetching user OJT:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
