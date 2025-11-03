const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  phone: {
    type: String,
    sparse: true, // Allow null
    match: /^(\+91)?[6-9]\d{9}$/
  },
  email: {
    type: String,
    sparse: true, // Allow null
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['registration', 'password_reset'],
    required: true
  },
  method: {
    type: String,
    enum: ['sms', 'email', 'both'],
    default: 'sms'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Auto delete after 10 minutes
  }
});

// Compound indexes for faster queries
OTPSchema.index({ phone: 1, createdAt: 1 });
OTPSchema.index({ email: 1, createdAt: 1 });
OTPSchema.index({ phone: 1, email: 1, type: 1 });

// Validate that at least phone or email is provided
OTPSchema.pre('validate', function(next) {
  if (!this.phone && !this.email) {
    next(new Error('Either phone or email is required'));
  } else {
    next();
  }
});

module.exports = mongoose.model('OTP', OTPSchema);