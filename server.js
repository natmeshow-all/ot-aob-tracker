require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase } = require('./db/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
const authLocalRouter = require('./routes/auth.local').router;
const apiRouter = require('./routes/api');

app.use('/api/auth', authLocalRouter);
app.use('/api', apiRouter);

// Serve index.html for all non-API routes (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
setupDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log('🍃 Connected to MongoDB Atlas');
    });
}).catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
});
