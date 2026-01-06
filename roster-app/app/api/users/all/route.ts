import { connectToDatabase } from "../../../../lib/mongoose-client";
import User from "../../../../models/users";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await connectToDatabase();

        const users = await User.find({}).select('user_id name team proficiency_grade -_id');

        return NextResponse.json({ success: true, data: users });
    } catch (error) {
        console.error("Error fetching all users:", error);
        return NextResponse.json({ success: false, message: "Failed to fetch users." }, { status: 500 });
    }
}
