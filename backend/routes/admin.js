const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const { sendBookingConfirmation, sendCancellationNotice } = require('../utils/smsService');
const BlockedSlot = require('../models/BlockedSlot');

// Get all appointments
router.get('/appointments', adminAuth, async (req, res) => {
  try {
    const { date, status } = req.query;
    let query = {};
    
    if (date) {
      const selectedDate = new Date(date);
      query.date = {
        $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(selectedDate.setHours(23, 59, 59, 999))
      };
    }
    
    if (status) {
      query.status = status;
    }
    
    const appointments = await Appointment.find(query)
      .sort({ date: 1, timeSlot: 1 })
      .populate('user', 'name phone isBlocked');
    
    res.json({ appointments });
  } catch (error) {
    console.error('Get All Appointments Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment status
router.patch('/appointments/:id', adminAuth, async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('user', 'phone');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    const oldStatus = appointment.status;
    appointment.status = status;
    if (notes) appointment.notes = notes;
    await appointment.save();
    
    // Send SMS notification
    if (status === 'confirmed' && oldStatus === 'pending') {
      const formattedDate = appointment.date.toLocaleDateString('en-IN');
      await sendBookingConfirmation(appointment.user.phone, formattedDate, appointment.timeSlot);
    } else if (status === 'cancelled') {
      await sendCancellationNotice(appointment.user.phone);
    }
    
    res.json({ message: 'Appointment updated successfully', appointment });
  } catch (error) {
    console.error('Update Appointment Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({ users });
  } catch (error) {
    console.error('Get Users Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Block/Unblock user
router.patch('/users/:id/block', adminAuth, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.isAdmin) {
      return res.status(400).json({ message: 'Cannot block admin' });
    }
    
    user.isBlocked = isBlocked;
    await user.save();
    
    // Cancel all pending/confirmed appointments if blocking
    if (isBlocked) {
      await Appointment.updateMany(
        { user: user._id, status: { $in: ['pending', 'confirmed'] } },
        { status: 'cancelled' }
      );
      
      await sendCancellationNotice(user.phone);
    }
    
    res.json({ 
      message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
      user 
    });
  } catch (error) {
    console.error('Block User Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle admin role
router.patch('/users/:id/admin', adminAuth, async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Prevent demoting self
    if (target._id.toString() === req.user._id.toString() && isAdmin === false) {
      return res.status(400).json({ message: 'You cannot remove your own admin access' });
    }

    const before = target.isAdmin;
    target.isAdmin = !!isAdmin;
    await target.save();

    try {
      await AuditLog.create({
        user: req.user._id,
        type: 'admin_role_change',
        methodUsed: 'none',
        details: { targetUser: target._id, name: target.name, from: before, to: target.isAdmin }
      });
    } catch (e) { console.warn('⚠️  Audit admin_role_change failed:', e.message); }

    res.json({ message: target.isAdmin ? 'Admin access granted' : 'Admin access removed', user: target });
  } catch (error) {
    console.error('Toggle Admin Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const todayAppointments = await Appointment.countDocuments({
      date: { $gte: today },
      status: { $in: ['pending', 'confirmed'] }
    });
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const totalAppointments = await Appointment.countDocuments();
    
    res.json({
      totalUsers,
      todayAppointments,
      pendingAppointments,
      totalAppointments
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
// ============================================
// ADMIN BUSY/BLOCKED SLOTS MANAGEMENT
// ============================================
router.get('/blocked-slots', adminAuth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date query param is required (YYYY-MM-DD)' });
    const base = new Date(date);
    const start = new Date(base.setHours(0, 0, 0, 0));
    const end = new Date(base.setHours(23, 59, 59, 999));
    const slots = await BlockedSlot.find({ date: { $gte: start, $lt: end } }).sort({ timeSlot: 1 });
    res.json({ success: true, slots });
  } catch (error) {
    console.error('Get Blocked Slots Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/blocked-slots', adminAuth, async (req, res) => {
  try {
    const { date, timeSlot, reason } = req.body;
    if (!date || !timeSlot) return res.status(400).json({ message: 'date and timeSlot are required' });
    const d = new Date(date);
    const blocked = await BlockedSlot.create({ date: d, timeSlot, reason: reason || 'Busy', createdBy: req.user._id });
    res.status(201).json({ success: true, message: 'Slot blocked', blocked });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This slot is already blocked for the date' });
    }
    console.error('Create Blocked Slot Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/blocked-slots/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await BlockedSlot.findById(id);
    if (!existing) return res.status(404).json({ message: 'Blocked slot not found' });
    await BlockedSlot.deleteOne({ _id: id });
    res.json({ success: true, message: 'Slot unblocked' });
  } catch (error) {
    console.error('Delete Blocked Slot Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});