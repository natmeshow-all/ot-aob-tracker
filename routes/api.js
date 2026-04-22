const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const OTRecord = require('../models/OTRecord');
const ProvidentFund = require('../models/ProvidentFund');
const Transaction = require('../models/Transaction');
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

const toId = (id) => new mongoose.Types.ObjectId(id);

// ---------------------------------
// OT RECORDS
// ---------------------------------
router.get('/ot', async (req, res) => {
    try {
        const { year, month, startDate, endDate } = req.query;
        const query = { userId: toId(req.user.id) };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).getTime() + 86400000)
            };
        } else {
            if (year) query.year = parseInt(year);
            if (month) query.month = parseInt(month);
        }

        const records = await OTRecord.find(query).sort({ date: -1 }).lean();
        res.json(records.map(r => ({ ...r, id: r._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/ot', async (req, res) => {
    try {
        const { date, hours, hourlyRate, baseSalary, multiplier, total, description } = req.body;
        const record = new OTRecord({
            userId: toId(req.user.id),
            date, hours, hourlyRate,
            baseSalary: baseSalary || 0,
            multiplier: multiplier || 1,
            total, description
        });
        await record.save();
        const r = record.toObject();
        res.json({ ...r, id: r._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/ot/:id', async (req, res) => {
    try {
        await OTRecord.deleteOne({ _id: req.params.id, userId: toId(req.user.id) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------
// PROVIDENT FUND
// ---------------------------------
router.get('/fund', async (req, res) => {
    try {
        const fund = await ProvidentFund.findOne({ userId: toId(req.user.id) }).lean();
        if (!fund) return res.json(null);

        // Compute summary totals
        const contributions = fund.contributions || [];
        const employeeTotal = contributions.reduce((s, c) => s + (c.employeeAmount || 0), 0);
        const employerTotal = contributions.reduce((s, c) => s + (c.employerAmount || 0), 0);
        const total = employeeTotal + employerTotal;
        const totalMonths = contributions.length;

        // Duration
        let duration = '-';
        if (fund.startDate) {
            const start = new Date(fund.startDate);
            const now = new Date();
            const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
            const years = Math.floor(Math.max(0, months) / 12);
            const rem = Math.max(0, months) % 12;
            duration = years > 0 && rem > 0 ? `${years} ปี ${rem} เดือน`
                     : years > 0 ? `${years} ปี`
                     : `${Math.max(0, months)} เดือน`;
        }

        res.json({ ...fund, employeeTotal, employerTotal, total, totalMonths, duration, id: fund._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/fund', async (req, res) => {
    try {
        const { baseSalary, employeePercentage, employerPercentage, startDate, cutoffDate } = req.body;
        await ProvidentFund.findOneAndUpdate(
            { userId: toId(req.user.id) },
            { baseSalary, employeePercentage, employerPercentage, startDate, cutoffDate: cutoffDate || 0, updatedAt: new Date() },
            { upsert: true, new: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/fund/contributions', async (req, res) => {
    try {
        const { upToYear, upToMonth } = req.query;
        const fund = await ProvidentFund.findOne({ userId: toId(req.user.id) }).lean();
        if (!fund) return res.json([]);

        let contributions = fund.contributions || [];
        if (upToYear && upToMonth) {
            contributions = contributions.filter(c => {
                const d = new Date(c.date);
                return d.getFullYear() < parseInt(upToYear) ||
                    (d.getFullYear() === parseInt(upToYear) && d.getMonth() + 1 <= parseInt(upToMonth));
            });
        }
        res.json(contributions.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/fund/contributions', async (req, res) => {
    try {
        const { date, baseSalary, employeePercent, employerPercent, employeeAmount, employerAmount, description } = req.body;
        const fund = await ProvidentFund.findOne({ userId: toId(req.user.id) });
        if (!fund) return res.status(400).json({ error: 'Fund settings not found. Please save fund settings first.' });

        // Check duplicate month
        const targetDate = new Date(date);
        const isDuplicate = fund.contributions.some(c => {
            const d = new Date(c.date);
            return d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear();
        });
        if (isDuplicate) {
            return res.status(400).json({ error: 'มีการบันทึกยอดสะสมของเดือนนี้ไปแล้ว กรุณาลบของเดิมก่อนหากต้องการแก้ไข' });
        }

        fund.contributions.push({ date, baseSalary, employeePercent, employerPercent, employeeAmount, employerAmount, totalMonthly: employeeAmount + employerAmount, description: description || '' });
        await fund.save();

        const added = fund.contributions[fund.contributions.length - 1];
        res.json({ ...added.toObject(), id: added._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/fund/contributions/:id', async (req, res) => {
    try {
        const fund = await ProvidentFund.findOne({ userId: toId(req.user.id) });
        if (!fund) return res.status(400).json({ error: 'Fund not found' });

        fund.contributions = fund.contributions.filter(c => c._id.toString() !== req.params.id);
        await fund.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------
// TRANSACTIONS
// ---------------------------------
router.get('/transactions', async (req, res) => {
    try {
        const { year, month, startDate, endDate } = req.query;
        const query = { userId: toId(req.user.id) };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).getTime() + 86400000)
            };
        } else {
            if (year) query.year = parseInt(year);
            if (month) query.month = parseInt(month);
        }

        const records = await Transaction.find(query).sort({ date: -1 }).lean();
        res.json(records.map(r => ({ ...r, id: r._id })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/transactions', async (req, res) => {
    try {
        const { type, date, category, amount, foodDays, foodRate, description } = req.body;
        const t = new Transaction({ userId: toId(req.user.id), type, date, category, amount, foodDays: foodDays ?? null, foodRate: foodRate ?? null, description });
        await t.save();
        const r = t.toObject();
        res.json({ ...r, id: r._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/transactions/:id', async (req, res) => {
    try {
        const { type, date, category, amount, foodDays, foodRate, description } = req.body;
        const t = await Transaction.findOne({ _id: req.params.id, userId: toId(req.user.id) });
        if (!t) return res.status(404).json({ error: 'Transaction not found' });

        Object.assign(t, { type, date, category, amount, foodDays: foodDays ?? null, foodRate: foodRate ?? null, description });
        await t.save();
        const r = t.toObject();
        res.json({ ...r, id: r._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/transactions/:id', async (req, res) => {
    try {
        await Transaction.deleteOne({ _id: req.params.id, userId: toId(req.user.id) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
