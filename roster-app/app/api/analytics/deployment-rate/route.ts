import { connectToDatabase, User } from "../../../../lib/mongoose-client";
import Roster from "../../../../models/roster"; // Assuming Roster model exists
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    const currentYear = new Date().getFullYear();
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    // Fetch all non-planner users to determine total workforce per grade
    const allUsers = await User.find({ account_type: 'Non-Planner' }).select('proficiency_grade user_id');

    const deploymentRateData = [];

    for (let i = 0; i < 12; i++) {
      const monthNum = i + 1;
      const monthName = monthNames[i];

      const startOfMonth = new Date(currentYear, i, 1);
      const endOfMonth = new Date(currentYear, i + 1, 0); // Last day of the month

      const monthlyDeployment: Record<string, number | string> = {
        month: monthName,
      };

      for (let grade = 1; grade <= 9; grade++) {
        const usersInGrade = allUsers.filter(user => user.proficiency_grade === grade);
        const totalWorkforceInGrade = usersInGrade.length;
        
        console.log(`--- Debugging Deployment Rate ---`);
        console.log(`Month: ${monthName}, Grade: ${grade}`);
        console.log(`Start: ${startOfMonth.toISOString()}, End: ${endOfMonth.toISOString()}`);
        console.log(`Total workforce for Grade ${grade}: ${totalWorkforceInGrade}`);

        if (totalWorkforceInGrade === 0) {
          monthlyDeployment[`grade_${grade}`] = 0;
          console.log(`No workforce in Grade ${grade}, setting deployment to 0.`);
          continue;
        }

        const deployedUsersInGrade = await Roster.aggregate([
          {
            $match: {
              date: { $gte: startOfMonth, $lte: endOfMonth },
              user_id: { $in: usersInGrade.map(u => u.user_id) }
            }
          },
          {
            $group: {
              _id: "$user_id",
              count: { $sum: 1 }
            }
          }
        ]);

        const uniqueDeployedWorkers = deployedUsersInGrade.length;
        console.log(`Unique deployed workers for Grade ${grade} in ${monthName}: ${uniqueDeployedWorkers}`);

        const deploymentPercentage = (uniqueDeployedWorkers / totalWorkforceInGrade) * 100;
        monthlyDeployment[`grade_${grade}`] = parseFloat(deploymentPercentage.toFixed(2));
        console.log(`Deployment % for Grade ${grade} in ${monthName}: ${deploymentPercentage.toFixed(2)}`);
      }
      deploymentRateData.push(monthlyDeployment);
    }

    return NextResponse.json({ success: true, data: deploymentRateData });
  } catch (error) {
    console.error("Failed to fetch deployment rate analytics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch deployment rate analytics." },
      { status: 500 }
    );
  }
}
