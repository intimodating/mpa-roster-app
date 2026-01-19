import { connectToDatabase } from '../lib/mongoose-client';
import User from '../models/users';
import Competency from '../models/competencies';
import mongoose from 'mongoose';

// Grade to Competency mapping provided by the user
const competencyToGradeMap: { [key: string]: number } = {
    "East Control": 4, "West Control": 4,
    "VTIS East": 5, "VTIS West": 5, "Keppel Control": 5,
    "Sembawang Control": 6, "Pasir Panjang Control": 6, "Jurong Control": 6, "VTIS Central": 6,
    "Sembawang Control MTC": 7, "Pasir Panjang Control MTC": 7,
    "VTIC MTC": 8, "PSU": 8,
    "STW(PB)": 9, "GMDSS": 9,
    "Vista DO": 10
};

const allCompetenciesList = Object.keys(competencyToGradeMap);

// Helper function to get a random date within a range
function getRandomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function populateRandomCompetencies() {
    try {
        await connectToDatabase();
        console.log("Database connected successfully.");

        // 1. Find all 'Non-Planner' users
        const nonPlanners = await User.find({ account_type: 'Non-Planner' }).select('user_id').lean();
        const nonPlannerIds = nonPlanners.map(user => user.user_id);

        if (nonPlannerIds.length === 0) {
            console.log("No 'Non-Planner' users found to update.");
            return;
        }
        
        console.log(`Found ${nonPlannerIds.length} 'Non-Planner' users.`);

        // 2. Clear all existing competencies for these users to ensure a fresh start
        console.log("Clearing existing competencies for non-planners...");
        const deleteResult = await Competency.deleteMany({ user_id: { $in: nonPlannerIds } });
        console.log(`Deleted ${deleteResult.deletedCount} old competencies.`);

        const newCompetencies = [];
        const startDate = new Date('2023-01-01');
        const endDate = new Date('2025-12-31');

        // 3. Loop through each non-planner and assign random competencies
        for (const userId of nonPlannerIds) {
            const shuffledCompetencies = shuffleArray([...allCompetenciesList]);
            const numCompetenciesToAssign = Math.floor(Math.random() * 5) + 1; // Assign between 1 and 5 competencies
            const competenciesToAssign = shuffledCompetencies.slice(0, numCompetenciesToAssign);

            for (const competencyName of competenciesToAssign) {
                newCompetencies.push({
                    user_id: userId,
                    console: competencyName,
                    grade: competencyToGradeMap[competencyName],
                    date_achieved: getRandomDate(startDate, endDate),
                });
            }
        }

        // 4. Bulk insert all the new competencies
        if (newCompetencies.length > 0) {
            console.log(`Preparing to insert ${newCompetencies.length} new competencies...`);
            await Competency.insertMany(newCompetencies);
            console.log("Successfully populated new competencies for non-planners.");
        } else {
            console.log("No new competencies were generated to insert.");
        }

    } catch (error) {
        console.error("An error occurred while populating competencies:", error);
    } finally {
        console.log("Script finished. Disconnecting from database.");
        await mongoose.disconnect();
        process.exit(0);
    }
}

populateRandomCompetencies();
