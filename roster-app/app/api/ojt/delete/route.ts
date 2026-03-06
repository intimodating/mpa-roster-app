import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose-client';
import OJT from '../../../../models/ojt';

export async function POST(req: Request) {
    try {
        const { user_id, consoles } = await req.json();

        if (!user_id || !consoles || !Array.isArray(consoles)) {
            return NextResponse.json({ success: false, message: "Missing user_id or consoles array." }, { status: 400 });
        }

        await connectToDatabase();

        const result = await OJT.deleteMany({
            user_id: user_id,
            console: { $in: consoles }
        });

        return NextResponse.json({ success: true, message: `Deleted ${result.deletedCount} OJT records.` });

    } catch (error) {
        console.error("Error deleting OJT:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
