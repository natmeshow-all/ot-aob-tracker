const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    foodDays: { type: Number, default: null },
    foodRate: { type: Number, default: null },
    description: { type: String, default: '' },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

transactionSchema.index({ userId: 1, year: 1, month: 1, type: 1 });

transactionSchema.pre('save', function () {
    const date = new Date(this.date);
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
});

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
