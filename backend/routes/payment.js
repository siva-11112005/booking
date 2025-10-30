const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const { auth } = require('../middleware/auth');
const notificationService = require('../utils/notificationService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create payment order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { appointmentId, amount } = req.body;
    
    // Verify appointment exists and belongs to user
    const appointment = await Appointment.findOne({
      _id: appointmentId,
      user: req.user._id
    });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    
    // Check if already paid
    const existingPayment = await Payment.findOne({
      appointment: appointmentId,
      status: 'success'
    });
    
    if (existingPayment) {
      return res.status(400).json({ message: 'Appointment already paid' });
    }
    
    // Create Razorpay order
    const options = {
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: `receipt_${appointmentId}_${Date.now()}`,
      notes: {
        appointmentId,
        userId: req.user._id.toString(),
        userName: req.user.name,
        userPhone: req.user.phone
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    // Save payment record
    const payment = await Payment.create({
      user: req.user._id,
      appointment: appointmentId,
      orderId: order.id,
      amount: amount,
      currency: 'INR',
      status: 'pending'
    });
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id
    });
    
  } catch (error) {
    console.error('Create Order Error:', error);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
});

// Verify payment
router.post('/verify-payment', auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentId
    } = req.body;
    
    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');
    
    if (razorpay_signature !== expectedSign) {
      // Update payment status to failed
      await Payment.findByIdAndUpdate(paymentId, {
        status: 'failed',
        failureReason: 'Invalid signature'
      });
      
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
    
    // Update payment record
    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        status: 'success',
        paidAt: new Date()
      },
      { new: true }
    ).populate('appointment');
    
    // Update appointment payment status
    await Appointment.findByIdAndUpdate(payment.appointment._id, {
      paymentStatus: 'paid',
      paymentId: payment._id
    });
    
    // Send confirmation email
    const user = await User.findById(req.user._id);
    if (user.email) {
      await emailService.sendPaymentConfirmationEmail(
        user.email,
        user.name,
        payment.amount,
        razorpay_payment_id,
        payment.appointment
      );
    }
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      payment
    });
    
  } catch (error) {
    console.error('Verify Payment Error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
});

// Get payment details
router.get('/payment/:appointmentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      appointment: req.params.appointmentId,
      user: req.user._id
    });
    
    res.json({ payment });
  } catch (error) {
    console.error('Get Payment Error:', error);
    res.status(500).json({ message: 'Failed to fetch payment details' });
  }
});

// Get all payments (admin)
router.get('/all-payments', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const payments = await Payment.find()
      .populate('user', 'name phone email')
      .populate('appointment')
      .sort({ createdAt: -1 });
    
    const stats = {
      total: payments.length,
      successful: payments.filter(p => p.status === 'success').length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      totalRevenue: payments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + p.amount, 0)
    };
    
    res.json({ payments, stats });
  } catch (error) {
    console.error('Get All Payments Error:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

module.exports = router;