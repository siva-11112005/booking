const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { generateTimeSlots } = require('../utils/timeSlots');
const notificationService = require('../utils/notificationService');

// ============================================
// PRICING CONFIGURATION
// ============================================
const PRICING = {
  consultation: {
    regular: 5,
    followUp: 3,
    emergency: 8
  },
  
  treatments: {
    'Back Pain': 6,
    'Neck Pain': 5,
    'Knee Pain': 6,
    'Shoulder Pain': 6,
    'Sports Injury': 7,
    'Other': 5
  },
  
  packages: [
    {
      id: 'package5',
      sessions: 5,
      price: 2250,
      discount: 10,
      perSession: 450
    },
    {
      id: 'package10',
      sessions: 10,
      price: 4250,
      discount: 15,
      perSession: 425
    },
    {
      id: 'package20',
      sessions: 20,
      price: 8000,
      discount: 20,
      perSession: 400
    }
  ],
  
  currency: 'INR',
  symbol: '₹'
};

// Helper function to calculate consultation fee
const getConsultationFee = (painType = 'Other', consultationType = 'regular') => {
  // First check if it's a specific treatment type
  if (PRICING.treatments[painType]) {
    return PRICING.treatments[painType];
  }
  
  // Otherwise use consultation type
  return PRICING.consultation[consultationType] || PRICING.consultation.regular;
};

// ============================================
// GET PRICING INFORMATION
// ============================================
router.get('/pricing', async (req, res) => {
  try {
    res.json({ 
      success: true,
      pricing: PRICING 
    });
  } catch (error) {
    console.error('Get Pricing Error:', error);
    res.status(500).json({ message: 'Failed to get pricing information' });
  }
});

// ============================================
// GET AVAILABLE TIME SLOTS FOR A DATE
// ============================================
router.get('/slots/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const selectedDate = new Date(date);
    
    // Check if it's Sunday
    if (selectedDate.getDay() === 0) {
      return res.json({ 
        success: true,
        slots: [],
        message: 'Clinic is closed on Sundays'
      });
    }
    
    // Get all time slots
    const allSlots = generateTimeSlots();
    
    // Get booked slots for this date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const bookedAppointments = await Appointment.find({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: { $in: ['pending', 'confirmed'] }
    });
    
    const bookedSlots = bookedAppointments.map(apt => apt.timeSlot);
    
    // Mark slots as available or booked
    const slots = allSlots.map(slot => ({
      time: slot,
      isBooked: bookedSlots.includes(slot)
    }));
    
    res.json({ 
      success: true,
      slots,
      date: selectedDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Get Slots Error:', error);
    res.status(500).json({ message: 'Failed to fetch time slots' });
  }
});

// ============================================
// BOOK APPOINTMENT WITH PRICING
// ============================================
router.post('/book', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Admin cannot book appointments for themselves' 
      });
    }
    
    // Check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({ 
        message: 'Your account is blocked. Please contact admin.' 
      });
    }
    
    const { 
      date, 
      timeSlot, 
      painType = 'Other', 
      consultationType = 'regular',
      reason,
      phone,
      email 
    } = req.body;
    
    // Validate required fields
    if (!date || !timeSlot) {
      return res.status(400).json({ 
        message: 'Date and time slot are required' 
      });
    }
    
    // Calculate consultation amount
    const amount = getConsultationFee(painType, consultationType);
    
    // Validate date
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format' 
      });
    }
    
    if (appointmentDate < today) {
      return res.status(400).json({ 
        message: 'Cannot book appointments in the past' 
      });
    }
    
    // Check booking window (7 days advance)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    if (appointmentDate > maxDate) {
      return res.status(400).json({ 
        message: 'Appointments can only be booked up to 7 days in advance' 
      });
    }
    
    // Check if it's Sunday
    if (appointmentDate.getDay() === 0) {
      return res.status(400).json({ 
        message: 'Clinic is closed on Sundays' 
      });
    }
    
    // Check if slot is already booked
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAppointment = await Appointment.findOne({
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      timeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ 
        message: 'This slot is already booked. Please select another time.' 
      });
    }
    
    // Check if user has pending appointments (limit to 3 pending)
    const pendingCount = await Appointment.countDocuments({
      user: req.user._id,
      status: 'pending'
    });
    
    if (pendingCount >= 3) {
      return res.status(400).json({ 
        message: 'You have reached the maximum limit of pending appointments (3). Please complete or cancel existing appointments.' 
      });
    }
    
    // Create appointment with amount
    const appointment = await Appointment.create({
      user: req.user._id,
      date: appointmentDate,
      timeSlot,
      painType,
      consultationType: consultationType || 'regular',
      amount,
      reason: reason || '',
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    // Populate user details for response
    await appointment.populate('user', 'name phone email');
    
    // Format date for SMS
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Send confirmation via SMS and Email
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
      time: timeSlot,
      amount: `₹${amount}`
    });
    
    res.status(201).json({ 
      success: true,
      message: 'Appointment booked successfully! Confirmation sent via SMS.',
      appointment: {
        id: appointment._id,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        painType: appointment.painType,
        consultationType: appointment.consultationType,
        amount: appointment.amount,
        status: appointment.status,
        paymentStatus: appointment.paymentStatus,
        createdAt: appointment.createdAt
      },
      amount,
      currency: PRICING.currency,
      paymentRequired: true
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'This slot is already booked. Please refresh and try again.' 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to book appointment. Please try again.' 
    });
  }
});

// ============================================
// GET USER'S APPOINTMENTS
// ============================================
router.get('/my-appointments', auth, async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    
    let query = { user: req.user._id };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Filter upcoming appointments
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
      query.status = { $in: ['pending', 'confirmed'] };
    }
    
    const appointments = await Appointment.find(query)
      .sort({ date: -1, timeSlot: 1 })
      .populate('user', 'name phone email')
      .populate('paymentId');
    
    // Add pricing information to each appointment
    const appointmentsWithPricing = appointments.map(apt => ({
      ...apt.toObject(),
      currency: PRICING.currency,
      symbol: PRICING.symbol
    }));
    
    res.json({ 
      success: true,
      appointments: appointmentsWithPricing,
      total: appointments.length
    });
  } catch (error) {
    console.error('Get Appointments Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch appointments' 
    });
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
      return res.status(404).json({ 
        message: 'Appointment not found' 
      });
    }
    
    // Check if user owns this appointment or is admin
    if (appointment.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Not authorized to view this appointment' 
      });
    }
    
    res.json({ 
      success: true,
      appointment: {
        ...appointment.toObject(),
        currency: PRICING.currency,
        symbol: PRICING.symbol
      }
    });
  } catch (error) {
    console.error('Get Appointment Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch appointment details' 
    });
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
      return res.status(404).json({ 
        message: 'Appointment not found' 
      });
    }
    
    // Check if user owns this appointment or is admin
    if (appointment.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Not authorized to cancel this appointment' 
      });
    }
    
    // Check if already cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Appointment is already cancelled' 
      });
    }
    
    // Check if completed
    if (appointment.status === 'completed') {
      return res.status(400).json({ 
        message: 'Cannot cancel completed appointment' 
      });
    }
    
    // Check cancellation time (allow cancellation up to 2 hours before)
    const appointmentDateTime = new Date(appointment.date);
    const [hours, minutes] = appointment.timeSlot.split(' - ')[0].split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    appointmentDateTime.setHours(
      appointment.timeSlot.includes('PM') && hour !== 12 ? hour + 12 : hour,
      minute
    );
    
    const twoHoursBefore = new Date(appointmentDateTime.getTime() - 2 * 60 * 60 * 1000);
    
    if (new Date() > twoHoursBefore && !req.user.isAdmin) {
      return res.status(400).json({ 
        message: 'Cannot cancel appointment less than 2 hours before scheduled time. Please contact admin.' 
      });
    }
    
    // Update status
    appointment.status = 'cancelled';
    appointment.cancelledAt = new Date();
    appointment.cancelledBy = req.user._id;
    await appointment.save();
    
    // Send cancellation notification
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
    
    console.log('❌ Appointment cancelled:', {
      user: appointment.user.name,
      date: formattedDate,
      time: appointment.timeSlot
    });
    
    res.json({ 
      success: true,
      message: 'Appointment cancelled successfully. Confirmation sent via SMS.' 
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ 
      message: 'Failed to cancel appointment' 
    });
  }
});

// ============================================
// RESCHEDULE APPOINTMENT
// ============================================
router.patch('/:id/reschedule', auth, async (req, res) => {
  try {
    const { newDate, newTimeSlot } = req.body;
    
    if (!newDate || !newTimeSlot) {
      return res.status(400).json({ 
        message: 'New date and time slot are required' 
      });
    }
    
    const appointment = await Appointment.findById(req.params.id)
      .populate('user', 'name phone email');
    
    if (!appointment) {
      return res.status(404).json({ 
        message: 'Appointment not found' 
      });
    }
    
    // Check authorization
    if (appointment.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ 
        message: 'Not authorized' 
      });
    }
    
    // Validate new date
    const appointmentDate = new Date(newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return res.status(400).json({ 
        message: 'Cannot reschedule to a past date' 
      });
    }
    
    if (appointmentDate.getDay() === 0) {
      return res.status(400).json({ 
        message: 'Clinic is closed on Sundays' 
      });
    }
    
    // Check if new slot is available
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingAppointment = await Appointment.findOne({
      _id: { $ne: req.params.id },
      date: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      timeSlot: newTimeSlot,
      status: { $in: ['pending', 'confirmed'] }
    });
    
    if (existingAppointment) {
      return res.status(400).json({ 
        message: 'New slot is already booked' 
      });
    }
    
    // Update appointment
    const oldDate = appointment.date;
    const oldTimeSlot = appointment.timeSlot;
    
    appointment.date = appointmentDate;
    appointment.timeSlot = newTimeSlot;
    appointment.rescheduledAt = new Date();
    await appointment.save();
    
    // Send notification
    const formattedDate = appointmentDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    await notificationService.sendBookingConfirmation(
      appointment.user.phone,
      appointment.user.email,
      appointment.user.name,
      formattedDate,
      newTimeSlot,
      appointment.painType
    );
    
    res.json({ 
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment 
    });
  } catch (error) {
    console.error('Reschedule Appointment Error:', error);
    res.status(500).json({ 
      message: 'Failed to reschedule appointment' 
    });
  }
});

// ============================================
// GET APPOINTMENT STATISTICS (USER)
// ============================================
router.get('/stats/user', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const totalAppointments = await Appointment.countDocuments({ user: userId });
    const pendingAppointments = await Appointment.countDocuments({ user: userId, status: 'pending' });
    const confirmedAppointments = await Appointment.countDocuments({ user: userId, status: 'confirmed' });
    const completedAppointments = await Appointment.countDocuments({ user: userId, status: 'completed' });
    const cancelledAppointments = await Appointment.countDocuments({ user: userId, status: 'cancelled' });
    
    // Total amount spent
    const completedAppts = await Appointment.find({ 
      user: userId, 
      status: 'completed',
      paymentStatus: 'paid'
    });
    
    const totalSpent = completedAppts.reduce((sum, apt) => sum + (apt.amount || 0), 0);
    
    res.json({
      success: true,
      stats: {
        total: totalAppointments,
        pending: pendingAppointments,
        confirmed: confirmedAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        totalSpent,
        currency: PRICING.currency
      }
    });
  } catch (error) {
    console.error('Get User Stats Error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch statistics' 
    });
  }
});

module.exports = router;