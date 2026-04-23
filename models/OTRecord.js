const mongoose = require('mongoose');

const otRecordSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0 },
    hourlyRate: { type: Number, required: true, min: 0 },
    baseSalary: { type: Number, default: 0 },
    multiplier: { type: Number, default: 1 },
    total: { type: Number, required: true },
    description: { type: String, default: '' },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number },
    createdAt: { type: Date, default: Date.now }
});

otRecordSchema.index({ userId: 1, year: 1, month: 1 });

otRecordSchema.pre('save', function () {
    const date = new Date(this.date);
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
});

module.exports = mongoose.models.OTRecord || mongoose.model('OTRecord', otRecordSchema);
