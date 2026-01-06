const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const mongoose = require('mongoose');
const User = require('../models/users').default;

interface UserDocument {
    _id: any;
    proficiency_grade: number;
}

async function assignTeams() {
    console.log("Starting team assignment script...");
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) {
        throw new Error("Please define MONGODB_URI in .env.local");
    }

    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const users: UserDocument[] = await User.find({});
        console.log(`Found ${users.length} users to update.`);

        if (users.length > 0) {
            const usersByProficiency = users.reduce((acc: Record<number, UserDocument[]>, user: UserDocument) => {
                const grade = user.proficiency_grade;
                if (!acc[grade]) {
                    acc[grade] = [];
                }
                acc[grade].push(user);
                return acc;
            }, {} as Record<number, UserDocument[]>);

            const bulkOps: any[] = [];
            for (const grade in usersByProficiency) {
                const usersInGrade = usersByProficiency[grade];
                usersInGrade.forEach((user: UserDocument, index: number) => {
                    const team = (index % 9) + 1;
                    bulkOps.push({
                        updateOne: {
                            filter: { _id: user._id },
                            update: { $set: { team: team } }
                        }
                    });
                });
            }

            console.log(`Prepared ${bulkOps.length} update operations.`);
            if (bulkOps.length > 0) {
                console.log("Attempting to update documents...");
                const updateResult = await User.bulkWrite(bulkOps);
                console.log("Update result object:", updateResult);
            }
        }

        console.log(`✅ Script finished successfully!`);

    } catch (error) {
        console.error("❌ Error during script execution:", error);
    } finally {
        await mongoose.connection.close();
        console.log("Disconnected from MongoDB.");
    }
}

assignTeams();
