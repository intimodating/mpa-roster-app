const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Define inline schemas to avoid import issues
const userSchema = new mongoose.Schema({
  user_id: String,
  account_type: String,
  name: String,
  team: Number
}, { collection: 'Users' });

const competencySchema = new mongoose.Schema({
  user_id: String,
  console: String
}, { collection: 'Competencies' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Competency = mongoose.models.Competency || mongoose.model('Competency', competencySchema);

async function exportData() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI not found in .env.local");
        process.exit(1);
    }

    try {
        await mongoose.connect(uri);
        console.log("Connected to MongoDB");

        const users = await User.find({ account_type: 'Non-Planner' }).lean();
        console.log(`Fetched ${users.length} users`);

        const competencies = await Competency.find({}).lean();
        console.log(`Fetched ${competencies.length} competencies`);

        const compMap = {};
        competencies.forEach(c => {
            if (!compMap[c.user_id]) compMap[c.user_id] = [];
            compMap[c.user_id].push(c.console);
        });

        const formattedEmployees = users.map(u => ({
            id: u.user_id,
            name: u.name,
            competencies: compMap[u.user_id] || [],
            offset: u.team ? (u.team - 1) % 9 : 0
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
