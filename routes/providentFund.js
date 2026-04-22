const express = require('express');
const router = express.Router();
const ProvidentFund = require('../models/ProvidentFund');

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// Get user's provident fund data
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const fund = await ProvidentFund.findOne({ userId: req.user._id });
        res.json(fund);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update provident fund settings
router.post('/settings', isAuthenticated, async (req, res) => {
    try {
        const { baseSalary, employeePercentage, startDate } = req.body;

        let fund = await ProvidentFund.findOne({ userId: req.user._id });

        if (fund) {
            fund.baseSalary = baseSalary;
            fund.employeePercentage = employeePercentage;
            if (startDate) fund.startDate = startDate;
            fund.updatedAt = Date.now();
        } else {
            fund = new ProvidentFund({
                userId: req.user._id,
                baseSalary,
                employeePercentage,
                employerPercentage: 5, // Fixed 5%
                startDate: startDate || new Date(),
                contributions: []
            });
        }

        await fund.save();
        res.json(fund);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add monthly contribution
router.post('/contribution', isAuthenticated, async (req, res) => {
    try {
        const { month, year } = req.body;

        const fund = await ProvidentFund.findOne({ userId: req.user._id });

        if (!fund) {
            return res.status(404).json({ error: 'Provident fund not set up' });
        }

        // Check if contribution for this month already exists
        const existingContribution = fund.contributions.find(
            c => c.month === month && c.year === year
        );

        if (existingContribution) {
            return res.status(400).json({ error: 'Contribution for this month already exists' });
        }

        // Calculate contributions
        const employeeContribution = (fund.baseSalary * fund.employeePercentage) / 100;
        const employerContribution = (fund.baseSalary * fund.employerPercentage) / 100;
        const totalMonthly = employeeContribution + employerContribution;

        fund.contributions.push({
            month,
            year,
            employeeContribution,
            employerContribution,
            totalMonthly
        });

        fund.updatedAt = Date.now();
        await fund.save();

        res.json(fund);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get monthly summary
router.get('/monthly/:year/:month', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        const fund = await ProvidentFund.findOne({ userId: req.user._id });

        if (!fund) {
            return res.json(null);
        }

        const contribution = fund.contributions.find(
            c => c.month === month && c.year === year
        );

        res.json({
            fund: {
                baseSalary: fund.baseSalary,
                employeePercentage: fund.employeePercentage,
                employerPercentage: fund.employerPercentage,
                startDate: fund.startDate,
                duration: fund.durationDisplay
            },
            contribution: contribution || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get yearly summary
router.get('/yearly/:year', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);

        const fund = await ProvidentFund.findOne({ userId: req.user._id });

        if (!fund) {
            return res.json(null);
        }

        const yearContributions = fund.contributions.filter(c => c.year === year);

        const totalEmployee = yearContributions.reduce((sum, c) => sum + c.employeeContribution, 0);
        const totalEmployer = yearContributions.reduce((sum, c) => sum + c.employerContribution, 0);
        const totalYearly = totalEmployee + totalEmployer;

        // Monthly breakdown
        const monthlyData = {};
        for (let i = 1; i <= 12; i++) {
            const contrib = yearContributions.find(c => c.month === i);
            monthlyData[i] = contrib ? {
                employee: contrib.employeeContribution,
                employer: contrib.employerContribution,
                total: contrib.totalMonthly
            } : { employee: 0, employer: 0, total: 0 };
        }

        res.json({
            fund: {
                baseSalary: fund.baseSalary,
                employeePercentage: fund.employeePercentage,
                employerPercentage: fund.employerPercentage,
                startDate: fund.startDate,
                duration: fund.durationDisplay,
                cumulativeTotal: fund.cumulativeTotal
            },
            year,
            totalEmployee,
            totalEmployer,
            totalYearly,
            monthlyData,
            contributionCount: yearContributions.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete contribution
router.delete('/contribution/:year/:month', isAuthenticated, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        const month = parseInt(req.params.month);

        const fund = await ProvidentFund.findOne({ userId: req.user._id });

        if (!fund) {
            return res.status(404).json({ error: 'Provident fund not found' });
        }

        fund.contributions = fund.contributions.filter(
            c => !(c.month === month && c.year === year)
        );

        fund.updatedAt = Date.now();
        await fund.save();

        res.json({ message: 'Contribution deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
