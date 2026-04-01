import { connectToDatabase } from "../../../../lib/mongoose-client";
import User from "../../../../models/users";
import Roster from "../../../../models/roster";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ success: false, message: 'Missing startDate or endDate' }, { status: 400 });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    // Ensure endDate includes the full day
    endDate.setHours(23, 59, 59, 999);

    console.log(`DEBUG: Night shift distribution from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Aggregate to get the distribution of night shifts for Non-Planners (Staff)
    const distribution = await User.aggregate([
      { 
        $match: { 
          account_type: 'Non-Planner' 
        } 
      },
      {
        $lookup: {
          from: 'Rosters',
          let: { userId: '$user_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user_id', '$$userId'] },
                    { $eq: ['$shift_type', 'Night'] },
                    { $gte: ['$date', startDate] },
                    { $lte: ['$date', endDate] }
                  ]
                }
              }
            }
          ],
          as: 'nightShifts'
        }
      },
      {
        $project: {
          user_id: 1,
          nightShiftCount: { $size: '$nightShifts' }
        }
      },
      {
        $group: {
          _id: '$nightShiftCount',
          userCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          nightShifts: '$_id',
          userCount: 1
        }
      }
    ]);

    // Fill in gaps for nightShifts from 0 to max
    const maxShifts = distribution.length > 0 ? Math.max(...distribution.map(d => d.nightShifts)) : 0;
    const filledData = [];
    for (let i = 0; i <= maxShifts; i++) {
      const existing = distribution.find(d => d.nightShifts === i);
      filledData.push({
        nightShifts: i,
        userCount: existing ? existing.userCount : 0
      });
    }

    return NextResponse.json({ success: true, data: filledData });
  } catch (error) {
    console.error("Failed to fetch night shift distribution:", error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
