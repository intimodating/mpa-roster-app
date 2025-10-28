import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/users";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    let body;
    try {
        body = await req.json();
    } catch (jsonError) {
        console.error("JSON Parsing Error:", jsonError);
        return NextResponse.json({ success: false, message: `Invalid JSON in request body: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}` }, { status: 400 });
    }

    try {
        const { user_id, password, account_type, proficiency_grade } = body;

        if (!user_id) {
            return NextResponse.json({ success: false, message: "User ID is required to update a worker." }, { status: 400 });
        }

        await connectToDatabase();

        const updateFields: any = {};
        if (password !== undefined) updateFields.password = password; // In a real application, hash this password!
        if (account_type !== undefined) updateFields.account_type = account_type;
        if (proficiency_grade !== undefined && proficiency_grade !== '') updateFields.proficiency_grade = parseInt(proficiency_grade, 10);

        if (Object.keys(updateFields).length === 0) {
            return NextResponse.json({ success: false, message: "No update fields provided." }, { status: 400 });
        }

        const result = await User.findOneAndUpdate(
            { user_id },
            { $set: updateFields },
            { new: true } // Return the updated document
        );

        if (!result) {
            return NextResponse.json({ success: false, message: "Worker not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Worker updated successfully.", user: result }, { status: 200 });

    } catch (error) {
        console.error("Update Worker Error:", error);
        return NextResponse.json({ 
            success: false, 
            message: `Failed to update worker due to server error: ${error instanceof Error ? error.message : String(error)}` 
        }, { status: 500 });
    }
}
