const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  painType: {
    type: String,
    default: 'Other'
  },
  consultationType: {
    type: String,
    enum: ['regular', 'followUp', 'emergency'],
    default: 'regular'
  },
  amount: {
    type: Number,
    required: true,
    default: 1
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'clinic', 'cash', 'pending'],
    default: 'pending'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rescheduledAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent double booking
AppointmentSchema.index({ date: 1, timeSlot: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);