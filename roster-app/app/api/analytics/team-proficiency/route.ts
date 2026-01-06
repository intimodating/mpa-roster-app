import { NextResponse } from 'next/server';
import User from '@/models/users';
import { connectToDatabase } from '@/lib/mongoose-client';

export async function GET() {
    try {
        await connectToDatabase();

        const data = await User.aggregate([
            {
                $group: {
                    _id: { team: "$team", proficiency_grade: "$proficiency_grade" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.team": 1, "_id.proficiency_grade": 1 }
            }
        ]);

        const result = data.reduce((acc, item) => {
            const { team, proficiency_grade } = item._id;
            const { count } = item;

            if (team === null || proficiency_grade === null) {
                return acc;
            }

            if (!acc[team]) {
                acc[team] = { team: team };
            }
            acc[team][proficiency_grade] = count;

            return acc;
        }, {});

        return NextResponse.json({ success: true, data: Object.values(result) });
    } catch (error) {
        console.error("Error fetching team proficiency data:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
