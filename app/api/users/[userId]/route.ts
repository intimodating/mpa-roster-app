import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, context: { params: { userId: string } }) {
    const { userId } = await context.params;

    if (!userId) {
        return NextResponse.json({ success: false, message: "User ID parameter is missing" }, { status: 400 });
    }

    try {
        await connectToDatabase();
        const user = await User.findOne({ user_id: userId }).select('user_id proficiency_grade -_id');

        if (!user) {
            return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ success: false, message: "Failed to fetch user data" }, { status: 500 });
    }
}
