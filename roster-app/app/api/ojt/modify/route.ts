import { NextResponse } from 'next/server';
import { connectToDatabase } from '../../../../lib/mongoose-client';
import OJT from '../../../../models/ojt';

export async function POST(req: Request) {
    try {
        const { user_id, console, shift_number } = await req.json();

        if (!user_id || !console || shift_number === undefined) {
            return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
        }

        await connectToDatabase();

        const updatedOJT = await OJT.findOneAndUpdate(
            { user_id: user_id, console: console },
            { shift_number: Number(shift_number) },
            { upsert: true, new: true }
        );

        return NextResponse.json({ success: true, ojt: updatedOJT });

    } catch (error) {
        console.error("Error modifying OJT:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
