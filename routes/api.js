const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { JWT_SECRET } = require('./auth.local');

// Auth Middleware
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

router.use(requireAuth);

// ---------------------------------
// OT RECORDS
// ---------------------------------
router.get('/ot', (req, res) => {
    const { year, month, startDate, endDate } = req.query;
    const db = getDb();
    let records = db.data.otRecords.filter(r => r.userId === req.user.id);
    
    if (startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        // Include the entire end date (set to end of day)
        records = records.filter(r => {
            const d = new Date(r.date).getTime();
            return d >= start && d <= end + 86400000; 
        });
    } else {
        if (year) records = records.filter(r => r.year == year);
        if (month) records = records.filter(r => r.month == month);
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(records);
});

router.post('/ot', async (req, res) => {
    const { date, hours, hourlyRate, baseSalary, multiplier, total, description, month, year } = req.body;
    const db = getDb();
    
    const newRecord = {
        id: Date.now().toString(),
        userId: req.user.id,
        date, hours, hourlyRate, baseSalary, multiplier, total, description, month, year,
        createdAt: new Date().toISOString()
    };
    
    db.data.otRecords.push(newRecord);
    await db.save();
    
    res.json(newRecord);
});

router.delete('/ot/:id', async (req, res) => {
    const db = getDb();
    db.data.otRecords = db.data.otRecords.filter(r => !(r.id === req.params.id && r.userId === req.user.id));
    await db.save();
    res.json({ success: true });
});

// ---------------------------------
// PROVIDENT FUNDS
// ---------------------------------
router.get('/fund', (req, res) => {
    const db = getDb();
    const fund = db.data.providentFunds.find(f => f.userId === req.user.id);
    res.json(fund || null);
});

router.post('/fund', async (req, res) => {
    const { baseSalary, employeePercentage, employerPercentage, startDate, cutoffDate } = req.body;
    const db = getDb();
    
    let fund = db.data.providentFunds.find(f => f.userId === req.user.id);
    if (fund) {
        fund.baseSalary = baseSalary;
        fund.employeePercentage = employeePercentage;
        fund.startDate = startDate;
        fund.cutoffDate = cutoffDate || 0; // 0 means end of month
        fund.updatedAt = new Date().toISOString();
    } else {
        db.data.providentFunds.push({
            userId: req.user.id,
            baseSalary,
            employeePercentage,
            employerPercentage,
            startDate,
            cutoffDate: cutoffDate || 0,
            contributions: [],
            updatedAt: new Date().toISOString()
        });
    }
    
    await db.save();
    res.json({ success: true });
});

router.post('/fund/contributions', async (req, res) => {
    const { date, baseSalary, employeePercent, employerPercent, employeeAmount, employerAmount, description } = req.body;
    const db = getDb();
    let fund = db.data.providentFunds.find(f => f.userId === req.user.id);
    
    if (!fund) return res.status(400).json({ error: 'Fund settings not found' });
    
    // Check for duplicate month
    const targetDate = new Date(date);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();
    
    fund.contributions = fund.contributions || [];
    const isDuplicate = fund.contributions.some(c => {
        const cDate = new Date(c.date);
        return cDate.getMonth() === targetMonth && cDate.getFullYear() === targetYear;
    });
    
    if (isDuplicate) {
        return res.status(400).json({ error: 'มีการบันทึกยอดสะสมของเดือนนี้ไปแล้ว กรุณาลบของเดิมก่อนหากต้องการแก้ไข' });
    }
    
    const newContribution = {
        id: Date.now().toString(),
        date,
        baseSalary,
        employeePercent,
        employerPercent,
        employeeAmount,
        employerAmount,
        totalMonthly: employeeAmount + employerAmount,
        description: description || '',
        createdAt: new Date().toISOString()
    };
    
    fund.contributions = fund.contributions || [];
    fund.contributions.push(newContribution);
    
    await db.save();
    res.json(newContribution);
});

router.delete('/fund/contributions/:id', async (req, res) => {
    const db = getDb();
    let fund = db.data.providentFunds.find(f => f.userId === req.user.id);
    if (!fund) return res.status(400).json({ error: 'Fund settings not found' });
    
    fund.contributions = (fund.contributions || []).filter(c => c.id !== req.params.id);
    await db.save();
    res.json({ success: true });
});

// ---------------------------------
// TRANSACTIONS
// ---------------------------------
router.get('/transactions', (req, res) => {
    const { year, month, startDate, endDate } = req.query;
    const db = getDb();
    let records = db.data.transactions.filter(r => r.userId === req.user.id);
    
    if (startDate && endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        records = records.filter(r => {
            const d = new Date(r.date).getTime();
            return d >= start && d <= end + 86400000; 
        });
    } else {
        if (year) records = records.filter(r => r.year == year);
        if (month) records = records.filter(r => r.month == month);
    }

    records.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(records);
});

router.post('/transactions', async (req, res) => {
    const { type, date, category, amount, foodDays, foodRate, description, month, year } = req.body;
    const db = getDb();
    
    const newRecord = {
        id: Date.now().toString(),
        userId: req.user.id,
        type, date, category, amount, foodDays: foodDays ?? null, foodRate: foodRate ?? null, description, month, year,
        createdAt: new Date().toISOString()
    };
    
    db.data.transactions.push(newRecord);
    await db.save();
    
    res.json(newRecord);
});

router.put('/transactions/:id', async (req, res) => {
    const { type, date, category, amount, foodDays, foodRate, description, month, year } = req.body;
    const db = getDb();
    
    const index = db.data.transactions.findIndex(r => r.id === req.params.id && r.userId === req.user.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Transaction not found' });
    }
    
    db.data.transactions[index] = {
        ...db.data.transactions[index],
        type, date, category, amount, foodDays: foodDays ?? null, foodRate: foodRate ?? null, description, month, year
    };
    
    await db.save();
    res.json(db.data.transactions[index]);
});

router.delete('/transactions/:id', async (req, res) => {
    const db = getDb();
    db.data.transactions = db.data.transactions.filter(r => !(r.id === req.params.id && r.userId === req.user.id));
    await db.save();
    res.json({ success: true });
});

module.exports = router;
