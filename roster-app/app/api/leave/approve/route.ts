import { connectToDatabase } from "../../../../lib/mongodb";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ success: false, message: "Leave ID is required" }, { status: 400 });
        }

        await connectToDatabase();

        const result = await Leave.updateMany({ _id: id }, { status: "Approved" });

        if (result.matchedCount === 0) {
            return NextResponse.json({ success: false, message: "Leave request not found." }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Leave request approved successfully." });

    } catch (error) {
        console.error("Approve Leave Error:", error);
        return NextResponse.json(
            { success: false, message: "Failed to approve leave request due to server error." },
            { status: 500 }
        );
    }
}
