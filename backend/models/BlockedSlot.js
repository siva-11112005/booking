const mongoose = require('mongoose');

const BlockedSlotSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  timeSlot: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    default: 'Busy',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicates for same date + slot
BlockedSlotSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('BlockedSlot', BlockedSlotSchema);