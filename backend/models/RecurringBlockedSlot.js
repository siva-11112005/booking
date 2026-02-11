const mongoose = require('mongoose');

const RecurringBlockedSlotSchema = new mongoose.Schema({
  weekday: { // 0=Sunday ... 6=Saturday
    type: Number,
    required: true,
    min: 0,
    max: 6,
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

RecurringBlockedSlotSchema.index({ weekday: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('RecurringBlockedSlot', RecurringBlockedSlotSchema);