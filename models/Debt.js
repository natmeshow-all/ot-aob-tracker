const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['standard', 'long_term'], default: 'standard' },
    totalAmount: { type: Number },
    durationMonths: { type: Number },
    startDate: { type: Date },
    paymentDate: { type: Number, min: 1, max: 31, default: 1 },
    interestRates: {
        year1: { type: Number },
        year2: { type: Number },
        year3: { type: Number },
        year4Plus: { type: Number }
    },
    autoAddExpense: { type: Boolean, default: false },
    name: { type: String, required: true },
    balance: { type: Number, required: true, min: 0 },
    interestType: { type: String, enum: ['effective', 'flat'], default: 'effective' },
    minPaymentPercentage: { type: Number, default: 5 }, // Minimum payment % for effective interest rate
    annualInterestRate: { type: Number, min: 0 }, // For standard debt
    monthlyInstallment: { type: Number, default: 0, min: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

debtSchema.pre('save', function () {
    this.updatedAt = Date.now();
});

module.exports = mongoose.models.Debt || mongoose.model('Debt', debtSchema);
