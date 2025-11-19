const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Relay Schedule' },
    action: { type: String, enum: ['on', 'off'], required: true },
    executeAt: { type: Date, required: true },
    timezone: { type: String, default: process.env.TIMEZONE || 'Asia/Bangkok' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    executedAt: { type: Date },
    failureReason: { type: String },
    metadata: {
      createdBy: { type: String, default: 'frontend' },
      notes: { type: String },
      requestedAt: { type: Date, default: Date.now }
    }
  },
  { timestamps: true }
);

scheduleSchema.index({ status: 1, executeAt: 1 });
scheduleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
