const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['profile_update', 'password_change', 'admin_role_change'], required: true },
  methodUsed: { type: String, enum: ['email', 'sms', 'none'], default: 'none' },
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now }
});

AuditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
