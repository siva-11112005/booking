const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  timeSlot: { type: String, required: true },
  reason: { type: String, default: '' },
  notified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

WaitlistSchema.index({ user: 1, date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model('Waitlist', WaitlistSchema);