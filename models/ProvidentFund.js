const mongoose = require('mongoose');

const providentFundSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    baseSalary: {
        type: Number,
        required: true,
        min: 0
    },
    employeePercentage: {
        type: Number,
        required: true,
        min: 1,
        max: 15,
        default: 5
    },
    employerPercentage: {
        type: Number,
        required: true,
        default: 5
    },
    startDate: {
        type: Date,
        required: true
    },
    contributions: [{
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true
        },
        employeeContribution: {
            type: Number,
            required: true
        },
        employerContribution: {
            type: Number,
            required: true
        },
        totalMonthly: {
            type: Number,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Virtual for cumulative total
providentFundSchema.virtual('cumulativeTotal').get(function () {
    return this.contributions.reduce((sum, contrib) => sum + contrib.totalMonthly, 0);
});

// Virtual for duration in months
providentFundSchema.virtual('durationMonths').get(function () {
    const now = new Date();
    const start = new Date(this.startDate);
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, months);
});

// Virtual for duration display
providentFundSchema.virtual('durationDisplay').get(function () {
    const months = this.durationMonths;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years > 0 && remainingMonths > 0) {
        return `${years} ปี ${remainingMonths} เดือน`;
    } else if (years > 0) {
        return `${years} ปี`;
    } else {
        return `${remainingMonths} เดือน`;
    }
});

// Ensure virtuals are included when converting to JSON
providentFundSchema.set('toJSON', { virtuals: true });
providentFundSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('ProvidentFund', providentFundSchema);
