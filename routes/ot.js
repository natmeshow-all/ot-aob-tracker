const express = require('express');
const router = express.Router();
const OTRecord = require('../models/OTRecord');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// Get all OT records for user
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { year, month } = req.query;
        const query = { userId: req.user._id };

        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        const records = await OTRecord.find(query).sort({ date: -1 });
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly summary
router.get('/monthly/:year/:month', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        const records = await OTRecord.find({
            userId: req.user._id,
            year,
            month
        });

        const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
        const totalAmount = records.reduce((sum, record) => sum + record.total, 0);

        res.json({
            year,
            month,
            totalHours,
            totalAmount,
            recordCount: records.length,
            records
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get yearly summary
router.get('/yearly/:year', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);

        const records = await OTRecord.find({
            userId: req.user._id,
            year
        });

        // Group by month
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            monthlyData[i] = { hours: 0, amount: 0, count: 0 };
        }

        records.forEach(record => {
            monthlyData[record.month].hours += record.hours;
            monthlyData[record.month].amount += record.total;
            monthlyData[record.month].count += 1;
        });

        const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
        const totalAmount = records.reduce((sum, record) => sum + record.total, 0);

        res.json({
            year,
            totalHours,
            totalAmount,
            recordCount: records.length,
            monthlyData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new OT record
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const otRecord = new OTRecord({
            ...req.body,
            userId: req.user._id
        });
        await otRecord.save();
        res.status(201).json(otRecord);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update OT record
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const record = await OTRecord.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        Object.assign(record, req.body);
        await record.save();
        res.json(record);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete OT record
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const record = await OTRecord.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
