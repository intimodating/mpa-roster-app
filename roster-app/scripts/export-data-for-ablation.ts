import mongoose from 'mongoose';
import User from '../models/users';
import Competency from '../models/competencies';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function exportData() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in .env.local");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        // Fetch all users
        const users = await User.find({ account_type: 'Non-Planner' }).lean();
        console.log(`Fetched ${users.length} non-planner users`);

        // Fetch all competencies
        const competencies = await Competency.find({}).lean();
        console.log(`Fetched ${competencies.length} competencies`);

        // Group competencies by user_id
        const compMap: Record<string, string[]> = {};
        competencies.forEach((c: any) => {
            if (!compMap[c.user_id]) compMap[c.user_id] = [];
            compMap[c.user_id].push(c.console);
        });

        // Format data for ablation study
        const formattedEmployees = users.map((u: any) => ({
            id: u.user_id,
            name: u.name,
            competencies: compMap[u.user_id] || [],
            offset: u.team ? (u.team - 1) % 9 : 0 // Fallback to team-based offset if available
        }));

        const exportPath = path.join(__dirname, '../../scheduler-service/real_data.json');
        fs.writeFileSync(exportPath, JSON.stringify(formattedEmployees, null, 2));
        console.log(`Data exported to ${exportPath}`);

        process.exit(0);
    } catch (error) {
        console.error("Export failed:", error);
        process.exit(1);
    }
}

exportData();
