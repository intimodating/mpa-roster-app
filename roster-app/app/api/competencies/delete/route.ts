import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose-client';
import Competency from '../../../../models/competencies'; // Import the Competency model

export async function POST(req: Request) {
    try {
        const { user_id, consoles } = await req.json();

        if (!user_id || !consoles || !Array.isArray(consoles) || consoles.length === 0) {
            return NextResponse.json({ success: false, message: "Missing required fields: user_id and consoles (array)." }, { status: 400 });
        }

        await connectToDatabase();

        const deleteResult = await Competency.deleteMany(
            { user_id: user_id, console: { $in: consoles } }
        );

        if (deleteResult.deletedCount === 0) {
            return NextResponse.json({ success: false, message: "No matching competencies found to delete." }, { status: 404 });
        }

        return NextResponse.json({ success: true, deletedCount: deleteResult.deletedCount });

    } catch (error) {
        console.error("Error deleting competencies:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
