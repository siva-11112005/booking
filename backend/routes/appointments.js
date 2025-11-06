const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { generateTimeSlots } = require('../utils/timeSlots');
const notificationService = require('../utils/notificationService');

// ============================================
// DEVELOPMENT PRICING (EVERYTHING ₹1)
// ============================================
const PRICING = {
  consultation: {
    regular: 1,
    followUp: 1,
    emergency: 1
  },
  treatments: {
    'Back Pain': 1,
    'Neck Pain': 1,
    'Knee Pain': 1,
    'Shoulder Pain': 1,
    'Sports Injury': 1,
    'Other': 1
  },
  currency: 'INR',
  symbol: '₹'
};

// ALWAYS RETURN ₹1 IN DEVELOPMENT
const getConsultationFee = (painType, consultationType) => {
  return 1; // Fixed ₹1 for all consultations in development
};

// ============================================
// GET PRICING
// ============================================
router.get('/pricing', async (req, res) => {
  try {
    res.json({ success: true, pricing: PRICING });
  } catch (error) {
    console.error('Get Pricing Error:', error);
    res.status(500).json({ message: 'Failed to get pricing' });
  }
});

// ============================================
// GET AVAILABLE SLOTS
// ============================================
router.get('/slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const selectedDate = new Date(date);
    
    if (selectedDate.getDay() === 0) {
      return res.json({ 
        success: true,
        slots: [],
        message: 'Clinic is closed on Sundays'
      });
    }
    
    const allSlots = generateTimeSlots();

    // Helper: parse slot start time like '10:00 AM - 10:50 AM' -> Date on selectedDate
    const parseSlotStart = (slotStr, baseDate) => {
      try {
        const startPart = slotStr.split('-')[0].trim(); // '10:00 AM'
        // Create date using baseDate components
        const parts = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!parts) return null;
        let hour = parseInt(parts[1], 10);
        const minute = parseInt(parts[2], 10);
        const ampm = parts[3].toUpperCase();
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        const d = new Date(baseDate);
        d.setHours(hour, minute, 0, 0);
        return d;
      } catch (e) {
        return null;
      }
    };

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookedAppointments = await Appointment.find({
      date: { $gte: startOfDay, $lt: endOfDay },
      status: { $in: ['pending', 'confirmed'] }
    });
    
    const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);
    
    const now = new Date();
    const isToday = startOfDay.toDateString() === new Date().toDateString();

    const slots = allSlots.map(slot => {
      // If selected date is today, mark past slots or slots within 1 hour as unavailable
      let unavailableDueToTime = false;
      if (isToday) {
        const slotStart = parseSlotStart(slot, startOfDay);
        if (slotStart) {
          const msToStart = slotStart.getTime() - now.getTime();
          // If slot already started or less than 30 minutes to start, mark unavailable
          if (msToStart <= 0 || msToStart < (30 * 60 * 1000)) {
            unavailableDueToTime = true;
          }
        }
      }

      return {
        time: slot,
        isBooked: bookedSlots.includes(slot) || unavailableDueToTime
      };
    });
    
    res.json({ 
      success: true,
      slots,
      date: selectedDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get Slots Error:', error);
    res.status(500).json({ message: 'Failed to fetch slots' });
  }
});

// ============================================
// BOOK APPOINTMENT
// ============================================
router.post('/book', auth, async (req, res) => {
  try {
    if (req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin cannot book appointments' });
    }
    
    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked' });
    }
    
    const { date, timeSlot, painType = 'Other', consultationType = 'regular', reason, phone, email } = req.body;
    
    if (!date || !timeSlot) {
      return res.status(400).json({ message: 'Date and time slot required' });
    }
    
    const amount = getConsultationFee(painType, consultationType);
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return res.status(400).json({ message: 'Cannot book past dates' });
    }
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    if (appointmentDate > maxDate) {
      return res.status(400).json({ message: 'Bookings only 7 days in advance' });
    }
    
    if (appointmentDate.getDay() === 0) {
      return res.status(400).json({ message: 'Closed on Sundays' });
    }
    
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAppointment = await Appointment.findOne({
      date: { $gte: startOfDay, $lt: endOfDay },
      timeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ message: 'Slot already booked' });
    }
    
    const pendingCount = await Appointment.countDocuments({
      user: req.user._id,
      status: 'pending'
    });
    
    if (pendingCount >= 3) {
      return res.status(400).json({ message: 'Maximum 3 pending appointments allowed' });
    }
    
    const appointment = await Appointment.create({
      user: req.user._id,
      date: appointmentDate,
      timeSlot,
      painType,
      consultationType,
      amount,
      reason: reason || '',
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'pending'
    });
    
    await appointment.populate('user', 'name phone email');
    
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const userPhone = phone || req.user.phone;
    const userEmail = email || req.user.email;
    
    await notificationService.sendBookingConfirmation(
      userPhone,
      userEmail,
      req.user.name,
      formattedDate,
      timeSlot,
      painType
    );
    
    console.log('✅ Appointment booked:', {
      user: req.user.name,
      date: formattedDate,
      amount: `₹${amount}`
    });
    
    res.status(201).json({ 
      success: true,
      message: 'Appointment booked successfully!',
      appointment: {
        id: appointment._id,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        painType: appointment.painType,
        amount: appointment.amount,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus
      },
      amount,
      currency: PRICING.currency,
      paymentRequired: true
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ message: 'Failed to book appointment' });
  }
});

// ============================================
// UPDATE PAYMENT METHOD
// ============================================
router.patch('/:id/payment-method', auth, async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    if (appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    appointment.paymentMethod = paymentMethod;
    
    if (paymentMethod === 'clinic') {
      appointment.paymentStatus = 'pending';
    }
    
    await appointment.save();
    
    res.json({
      success: true,
      message: 'Payment method updated',
      appointment
    });
  } catch (error) {
    console.error('Update Payment Method Error:', error);
    res.status(500).json({ message: 'Failed to update' });
  }
});

// ============================================
// GET MY APPOINTMENTS
// ============================================
router.get('/my-appointments', auth, async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    let query = { user: req.user._id };
    
    if (status) query.status = status;
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
      query.status = { $in: ['pending', 'confirmed'] };
    }
    
    const appointments = await Appointment.find(query)
      .sort({ date: -1, timeSlot: 1 })
      .populate('user', 'name phone email')
      .populate('paymentId');
    
    res.json({ 
      success: true,
      appointments,
      total: appointments.length
    });
  } catch (error) {
    console.error('Get Appointments Error:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// ============================================
// GET SINGLE APPOINTMENT
// ============================================
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('paymentId');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    if (appointment.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json({ success: true, appointment });
  } catch (error) {
    console.error('Get Appointment Error:', error);
    res.status(500).json({ message: 'Failed to fetch appointment' });
  }
});

// ============================================
// CANCEL APPOINTMENT
// ============================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('user', 'name phone email');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    if (appointment.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'Already cancelled' });
    }
    
    if (appointment.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel completed appointment' });
    }
    
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
    await appointment.save();
    
    const formattedDate = appointment.date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    await notificationService.sendCancellationNotice(
      appointment.user.phone,
      appointment.user.email,
      appointment.user.name,
      formattedDate,
      appointment.timeSlot
    );
    
    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancel Error:', error);
    res.status(500).json({ message: 'Failed to cancel' });
  }
});

// ============================================
// GET USER STATS
// ============================================
router.get('/stats/user', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const total = await Appointment.countDocuments({ user: userId });
    const pending = await Appointment.countDocuments({ user: userId, status: 'pending' });
    const confirmed = await Appointment.countDocuments({ user: userId, status: 'confirmed' });
    const completed = await Appointment.countDocuments({ user: userId, status: 'completed' });
    const cancelled = await Appointment.countDocuments({ user: userId, status: 'cancelled' });
    
    const completedAppts = await Appointment.find({ 
      user: userId, 
      status: 'completed',
      paymentStatus: 'paid'
    });
    
    const totalSpent = completedAppts.reduce((sum, apt) => sum + (apt.amount || 0), 0);
    
    res.json({
      success: true,
      stats: {
        total,
        pending,
        confirmed,
        completed,
        cancelled,
        totalSpent,
        currency: PRICING.currency
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

module.exports = router;