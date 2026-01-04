import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    const workforceData = await User.aggregate([
      {
        $match: {
          account_type: "Non-Planner",
        },
      },
      {
        $group: {
          _id: "$proficiency_grade",
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1, // Sort by grade
        },
      },
      {
        $project: {
          grade: { $toString: "$_id" }, // Convert grade to string for the chart axis
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Ensure all grades from 1-9 are present, even if their count is 0
    const allGradesData = Array.from({ length: 9 }, (_, i) => {
        const gradeNum = i + 1;
        const existingGrade = workforceData.find(d => d.grade === gradeNum.toString());
        return existingGrade || { grade: gradeNum.toString(), count: 0 };
    });


    return NextResponse.json({ success: true, data: allGradesData });
  } catch (error) {
    console.error("Failed to fetch workforce structure analytics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch workforce structure analytics." },
      { status: 500 }
    );
  }
}
