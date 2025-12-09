import { connectToDatabase } from "../../../../lib/mongoose-client";
import Leave from "../../../../models/leaves";
import { NextResponse } from "next/server";

export async function GET() {
  console.log("DEBUG: Starting leaves analytics GET request");
  try {
    await connectToDatabase();
    console.log("DEBUG: Database connected for leaves analytics");
    
    const currentYear = new Date().getFullYear();
    console.log("DEBUG: currentYear:", currentYear);

    console.log("DEBUG: Aggregation pipeline constructed, executing...");
    const leaveData = await Leave.aggregate([
      {
        $match: {
          status: "Approved", // Only consider approved leaves for analytics
          date: {
            $gte: new Date(currentYear, 0, 1), // Start of current year
            $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999), // End of current year
          },
        },
      },
      {
        $project: {
          month: { $month: "$date" },
          leave_type: "$leave_type",
        },
      },
      {
        $group: {
          _id: "$month",
          annual: {
            $sum: { $cond: [{ $eq: ["$leave_type", "Annual leave"] }, 1, 0] },
          },
          medical: {
            $sum: { $cond: [{ $eq: ["$leave_type", "Medical leave"] }, 1, 0] },
          },
          hospitalisation: {
            $sum: { $cond: [{ $eq: ["$leave_type", "Hospitalisation Leave"] }, 1, 0] },
          },
        },
      },
      {
        $sort: {
          _id: 1, // Sort by month (1-12)
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          annual: 1,
          medical: 1,
          hospitalisation: 1,
        },
      },
    ]);

    console.log("Raw leave aggregation result:", leaveData);

    // Map month numbers to names (Jan-Dec) and fill missing months with zero values
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const formattedData = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const existingData = leaveData.find((d) => d.month === monthNum);
      return {
        month: monthNames[i],
        annual: existingData ? existingData.annual : 0,
        medical: existingData ? existingData.medical : 0,
        hospitalisation: existingData ? existingData.hospitalisation : 0,
      };
    });

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Failed to fetch leave analytics:", error);
    console.error("Error object in catch:", error);
  }
}
