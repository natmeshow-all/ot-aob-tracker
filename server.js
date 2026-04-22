require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase } = require('./db/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB before every request (cached after first connection)
app.use(async (req, res, next) => {
    try {
        await setupDatabase();
        next();
    } catch (err) {
        console.error('DB connection error:', err.message);
        res.status(500).json({ error: 'Database connection failed: ' + err.message });
    }
});

// Routes
const authLocalRouter = require('./routes/auth.local').router;
const apiRouter = require('./routes/api');

app.use('/api/auth', authLocalRouter);
app.use('/api', apiRouter);

// Serve index.html for all non-API routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// For local development only
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('🍃 MongoDB Atlas connecting...');
    });
}

// Required for Vercel serverless
module.exports = app;
