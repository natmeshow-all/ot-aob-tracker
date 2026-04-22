const mongoose = require('mongoose');

let isConnected = false;

async function setupDatabase() {
    if (isConnected) return;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas');
}

module.exports = { setupDatabase };
