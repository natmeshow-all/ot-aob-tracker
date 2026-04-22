const fs = require('fs').promises;
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');

let dbData = {
    users: [],
    otRecords: [],
    providentFunds: [],
    transactions: []
};

async function setupDatabase() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        dbData = JSON.parse(data);
    } catch (e) {
        // If file doesn't exist, create it with default structure
        await saveDatabase();
    }
}

async function saveDatabase() {
    await fs.writeFile(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
}

function getDb() {
    return {
        data: dbData,
        save: saveDatabase
    };
}

module.exports = { getDb, setupDatabase };
