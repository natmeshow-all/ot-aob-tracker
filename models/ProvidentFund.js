const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    baseSalary: { type: Number, required: true },
    employeePercent: { type: Number, required: true },
    employerPercent: { type: Number, required: true },
    employeeAmount: { type: Number, required: true },
    employerAmount: { type: Number, required: true },
    totalMonthly: { type: Number, required: true },
    description: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const providentFundSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    baseSalary: { type: Number, default: 0 },
    employeePercentage: { type: Number, default: 5 },
    employerPercentage: { type: Number, default: 5 },
    startDate: { type: Date },
    cutoffDate: { type: Number, default: 0 },
    contributions: [contributionSchema],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.ProvidentFund || mongoose.model('ProvidentFund', providentFundSchema);
