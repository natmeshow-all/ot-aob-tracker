const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// Get all transactions for user
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const { year, month, type } = req.query;
        const query = { userId: req.user._id };

        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);
        if (type) query.type = type;

        const transactions = await Transaction.find(query).sort({ date: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get monthly summary
router.get('/monthly/:year/:month', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        const transactions = await Transaction.find({
            userId: req.user._id,
            year,
            month
        });

        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = income - expenses;

        // Group by category
        const categoryBreakdown = {};
        transactions.forEach(t => {
            if (!categoryBreakdown[t.category]) {
                categoryBreakdown[t.category] = { income: 0, expense: 0 };
            }
            if (t.type === 'income') {
                categoryBreakdown[t.category].income += t.amount;
            } else {
                categoryBreakdown[t.category].expense += t.amount;
            }
        });

        res.json({
            year,
            month,
            income,
            expenses,
            balance,
            transactionCount: transactions.length,
            categoryBreakdown,
            transactions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get yearly summary
router.get('/yearly/:year', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);

        const transactions = await Transaction.find({
            userId: req.user._id,
            year
        });

        // Group by month
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            monthlyData[i] = { income: 0, expenses: 0, balance: 0 };
        }

        transactions.forEach(t => {
            if (t.type === 'income') {
                monthlyData[t.month].income += t.amount;
            } else {
                monthlyData[t.month].expenses += t.amount;
            }
            monthlyData[t.month].balance = monthlyData[t.month].income - monthlyData[t.month].expenses;
        });

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = totalIncome - totalExpenses;

        res.json({
            year,
            totalIncome,
            totalExpenses,
            totalBalance,
            transactionCount: transactions.length,
            monthlyData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new transaction
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const transaction = new Transaction({
            ...req.body,
            userId: req.user._id
        });
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update transaction
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const transaction = await Transaction.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        Object.assign(transaction, req.body);
        await transaction.save();
        res.json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete transaction
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
