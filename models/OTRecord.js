const mongoose = require('mongoose');

const otRecordSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    hours: {
        type: Number,
        required: true,
        min: 0
    },
    hourlyRate: {
        type: Number,
        required: true,
        min: 0
    },
    total: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster queries
otRecordSchema.index({ userId: 1, year: 1, month: 1 });

// Pre-save middleware to calculate total and extract month/year
otRecordSchema.pre('save', function (next) {
    this.total = this.hours * this.hourlyRate;
    const date = new Date(this.date);
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
    next();
});

module.exports = mongoose.model('OTRecord', otRecordSchema);
