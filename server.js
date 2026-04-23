require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase } = require('./db/database');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://ui-avatars.com"],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(mongoSanitize());

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 150 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => process.env.NODE_ENV !== 'production',
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter); // Apply general rate limiter to all API routes
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
