"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_ts_1 = require("../lib/mongodb.ts");
const users_ts_1 = __importDefault(require("../models/users.ts"));
const firstNames = ["John", "Jane", "Peter", "Mary", "David", "Sarah", "Michael", "Emily", "Chris", "Anna"];
const lastNames = ["Smith", "Jones", "Williams", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson"];
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function addWorkers(numWorkers) {
    try {
        await (0, mongodb_ts_1.connectToDatabase)();
        console.log("Database connected.");
        const workersToAdd = [];
        for (let i = 0; i < numWorkers; i++) {
            const firstName = firstNames[getRandomInt(0, firstNames.length - 1)];
            const lastName = lastNames[getRandomInt(0, lastNames.length - 1)];
            const userId = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}`;
            const proficiencyGrade = getRandomInt(1, 9);
            workersToAdd.push({
                user_id: userId,
                password: userId, // As requested, password is the same as user_id
                account_type: "Non-Planner",
                proficiency_grade: proficiencyGrade,
                name: `${firstName} ${lastName}`,
                email: `${userId}@example.com`,
                age: getRandomInt(20, 60),
                hobbies: ["reading", "hiking", "gaming"][getRandomInt(0, 2)],
            });
        }
        // Insert workers in batches to avoid overwhelming the database
        const batchSize = 50;
        for (let i = 0; i < workersToAdd.length; i += batchSize) {
            const batch = workersToAdd.slice(i, i + batchSize);
            console.log(`Attempting to insert batch ${i / batchSize + 1}/${Math.ceil(workersToAdd.length / batchSize)} with ${batch.length} workers.`);
            try {
                const result = await users_ts_1.default.insertMany(batch, { ordered: false }); // ordered: false to continue on some errors
                console.log(`Successfully inserted ${result.length} workers in batch.`);
            }
            catch (batchError) {
                console.error(`Error inserting batch ${i / batchSize + 1}:`, batchError);
            }
        }
        console.log(`Successfully added ${numWorkers} workers.`);
    }
    catch (error) {
        console.error("Error adding workers:", error);
    }
    finally {
        // It's generally good practice to disconnect, but Mongoose manages connections internally in Next.js
        // If running as a standalone script, you might want to add mongoose.disconnect();
        console.log("Script finished.");
        process.exit(0);
    }
}
addWorkers(140);
