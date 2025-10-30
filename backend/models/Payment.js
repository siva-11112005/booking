const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  razorpayPaymentId: String,
  razorpayOrderId: String,
  razorpaySignature: String,
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  method: String,
  bank: String,
  wallet: String,
  vpa: String,
  email: String,
  contact: String,
  failureReason: String,
  refundStatus: String,
  refundAmount: Number,
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
PaymentSchema.index({ user: 1, appointment: 1 });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);