import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { user_id, password, account_type, proficiency_grade } = await req.json();

        if (!user_id || !password || !account_type || proficiency_grade === undefined) {
            return NextResponse.json({ success: false, message: "User ID, password, account type, and proficiency grade are required." }, { status: 400 });
        }

        await connectToDatabase();

        const existingUser = await User.findOne({ user_id });
        if (existingUser) {
            return NextResponse.json({ success: false, message: "User with this ID already exists." }, { status: 409 });
        }

        const newUser = new User({
            user_id,
            password, // In a real application, hash this password!
            account_type,
            proficiency_grade: parseInt(proficiency_grade, 10),
        });

        await newUser.save();

        return NextResponse.json({ success: true, message: "Worker added successfully." }, { status: 201 });

    } catch (error) {
        console.error("Add Worker Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: "Failed to add worker due to server error." 
        }, { status: 500 });
    }
}
