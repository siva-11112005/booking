const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOTP } = require('../utils/smsService');

const { sendOTP } = require('../utils/sms');  // Only one import!
const { auth } = require('../middleware/auth');
// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check OTP limit
const checkOTPLimit = async (phone) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const count = await OTP.countDocuments({
    phone,
    createdAt: { $gte: today }
  });
  
  return count < parseInt(process.env.MAX_OTP_PER_DAY);
};

// Send OTP for registration
router.post('/send-otp', async (req, res) => {
  try {
    let { phone } = req.body;
    
    // Validate Indian phone number
    phone = phone.trim();
    if (!phone.startsWith('+91')) {
      phone = '+91' + phone.replace(/^0+/, '');
    }
    
    const phoneRegex = /^(\+91)[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Invalid Indian phone number' });
    }
    
    // Check OTP limit
    const canSendOTP = await checkOTPLimit(phone);
    if (!canSendOTP) {
      return res.status(429).json({ message: 'Maximum OTP limit reached for today (5 OTPs)' });
    }
    
    // Check if phone already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'Phone number already registered' });
    }
    
    // Generate and save OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_VALIDITY_MINUTES) * 60000);
    
    await OTP.create({
      phone,
      otp,
      type: 'registration',
      expiresAt
    });
    
    // Send OTP via SMS
    await sendOTP(phone, otp);
    
    res.json({ message: 'OTP sent successfully', phone });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP and Register
router.post('/verify-otp', async (req, res) => {
  try {
    let { phone, otp, name, password, email } = req.body;
    
    // Normalize phone
    phone = phone.trim();
    if (!phone.startsWith('+91')) {
      phone = '+91' + phone.replace(/^0+/, '');
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    // Validate email if provided
    if (email) {
      email = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      
      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
    }
    
    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phone,
      otp,
      type: 'registration',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const isAdmin = phone === process.env.ADMIN_PHONE;
    
    const userData = {
      name: name.trim(),
      phone,
      password: hashedPassword,
      isAdmin,
      isVerified: true
    };
    
    // Add email only if provided
    if (email) {
      userData.email = email;
    }
    
    const user = await User.create(userData);
    
    // Delete used OTP
    await OTP.deleteMany({ phone, type: 'registration' });
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || null,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    
    if (error.code === 11000) {
      if (error.keyPattern.email) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      if (error.keyPattern.phone) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});
// Login with phone or email
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    // Check if fields are filled
    if (!identifier && !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }
    
    if (!identifier) {
      return res.status(400).json({ message: 'Please enter your phone number or email' });
    }
    
    if (!password) {
      return res.status(400).json({ message: 'Please enter your password' });
    }
    
    const cleanIdentifier = identifier.trim();
    
    // Check if identifier is empty after trim
    if (!cleanIdentifier) {
      return res.status(400).json({ message: 'Please enter your phone number or email' });
    }
    
    let user;
    let isEmail = false;
    
    // Check if identifier is email (contains @)
    if (cleanIdentifier.includes('@')) {
      isEmail = true;
      const email = cleanIdentifier.toLowerCase();
      user = await User.findOne({ email });
    } else {
      // Treat as phone number
      let phone = cleanIdentifier;
      // Add +91 prefix if not present
      if (!phone.startsWith('+91')) {
        phone = '+91' + phone.replace(/^0+/, '');
      }
      user = await User.findOne({ phone });
    }
    
    // Check if user exists
    if (!user) {
      if (isEmail) {
        return res.status(400).json({ message: 'Invalid email address. Please check and try again.' });
      } else {
        return res.status(400).json({ message: 'Invalid phone number. Please check and try again.' });
      }
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: 'Your account has been blocked. Contact admin: ' + process.env.ADMIN_PHONE 
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password. Please try again.' });
    }
    
    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email || null,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});
// Send OTP for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    let { phone } = req.body;
    
    // Normalize phone
    phone = phone.trim();
    if (!phone.startsWith('+91')) {
      phone = '+91' + phone.replace(/^0+/, '');
    }
    
    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'Phone number not registered' });
    }
    
    // Check OTP limit
    const canSendOTP = await checkOTPLimit(phone);
    if (!canSendOTP) {
      return res.status(429).json({ message: 'Maximum OTP limit reached for today (5 OTPs)' });
    }
    
    // Generate and save OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_VALIDITY_MINUTES) * 60000);
    
    await OTP.create({
      phone,
      otp,
      type: 'password_reset',
      expiresAt
    });
    
    // Send OTP via SMS
    await sendOTP(phone, otp);
    
    res.json({ message: 'OTP sent successfully', phone });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    let { phone, otp, newPassword } = req.body;
    
    // Normalize phone
    phone = phone.trim();
    if (!phone.startsWith('+91')) {
      phone = '+91' + phone.replace(/^0+/, '');
    }
    
    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    // Find valid OTP
    const otpRecord = await OTP.findOne({
      phone,
      otp,
      type: 'password_reset',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await User.findOneAndUpdate(
      { phone },
      { password: hashedPassword }
    );
    
    // Delete used OTP
    await OTP.deleteMany({ phone, type: 'password_reset' });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
        email: req.user.email || null,
        isAdmin: req.user.isAdmin
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;