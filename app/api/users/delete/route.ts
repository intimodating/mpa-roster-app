import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { user_id } = await req.json();

        if (!user_id) {
            return NextResponse.json({ success: false, message: "User ID is required to delete a worker." }, { status: 400 });
        }

        await connectToDatabase();

        const result = await User.findOneAndDelete({ user_id });

        if (!result) {
            return NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Worker deleted successfully." }, { status: 200 });

    } catch (error) {
        console.error("Delete Worker Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to delete worker due to server error." 
        }, { status: 500 });
    }
}
