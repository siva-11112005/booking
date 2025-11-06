const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { auth } = require('../middleware/auth');
const notificationService = require('../utils/notificationService');
const emailService = require('../utils/emailService');

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Validate Indian phone number
const validateIndianPhone = (phone) => {
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Format phone number to +91 format
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  phone = phone.trim().replace(/\s/g, '');
  if (!phone.startsWith('+91')) {
    phone = phone.replace(/^0+/, ''); // Remove leading zeros
    if (phone.length === 10) {
      phone = '+91' + phone;
    }
  }
  return phone;
};

// Validate email
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Check OTP limit per day
const checkOTPLimit = async (identifier) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const query = {};
  if (identifier.includes('@')) {
    query.email = identifier;
  } else {
    query.phone = identifier;
  }
  
  const count = await OTP.countDocuments({
    ...query,
    createdAt: { 
      $gte: today,
      $lt: tomorrow
    }
  });
  
  const maxOTPPerDay = parseInt(process.env.MAX_OTP_PER_DAY) || 5;
  return count < maxOTPPerDay;
};

// Clean expired OTPs
const cleanExpiredOTPs = async (identifier) => {
  const query = {};
  if (identifier.includes('@')) {
    query.email = identifier;
  } else {
    query.phone = identifier;
  }
  
  await OTP.deleteMany({
    ...query,
    expiresAt: { $lt: new Date() }
  });
};

// ============================================
// SEND OTP FOR REGISTRATION (SMS or Email)
// ============================================
router.post('/send-otp', async (req, res) => {
  try {
    let { phone, email, preferEmail = false } = req.body;
    
    // Must have either phone or email
    if (!phone && !email) {
      return res.status(400).json({ 
        message: 'Phone number or email is required' 
      });
    }
    
    let identifier = '';
    let formattedPhone = '';
    let formattedEmail = '';
    
    // If using phone
    if (phone && !preferEmail) {
      formattedPhone = formatPhoneNumber(phone);
      identifier = formattedPhone;
      
      if (!validateIndianPhone(formattedPhone)) {
        return res.status(400).json({ 
          message: 'Please enter a valid 10-digit Indian mobile number' 
        });
      }
      
      // Check if phone already registered
      const existingUser = await User.findOne({ phone: formattedPhone });
      if (existingUser && existingUser.isVerified) {
        return res.status(400).json({ 
          message: 'This phone number is already registered. Please login instead.' 
        });
      }
    }
    
    // If using email
    if (email) {
      formattedEmail = email.trim().toLowerCase();
      
      if (!validateEmail(formattedEmail)) {
        return res.status(400).json({ 
          message: 'Please enter a valid email address' 
        });
      }
      
      if (preferEmail) {
        identifier = formattedEmail;
        
        // Check if email already registered
        const existingUser = await User.findOne({ email: formattedEmail });
        if (existingUser && existingUser.isVerified) {
          return res.status(400).json({ 
            message: 'This email is already registered. Please login instead.' 
          });
        }
      }
    }
    
    // Clean expired OTPs
    await cleanExpiredOTPs(identifier);
    
    // Check daily OTP limit
    const canSendOTP = await checkOTPLimit(identifier);
    if (!canSendOTP) {
      return res.status(429).json({ 
        message: `Maximum OTP limit reached for today (${process.env.MAX_OTP_PER_DAY || 5} OTPs). Please try again tomorrow.` 
      });
    }
    
    // Check for recent OTP (prevent spam)
    const recentOTPQuery = {};
    if (formattedPhone) recentOTPQuery.phone = formattedPhone;
    if (formattedEmail && preferEmail) recentOTPQuery.email = formattedEmail;
    
    const recentOTP = await OTP.findOne({
      ...recentOTPQuery,
      type: 'registration',
      createdAt: { $gt: new Date(Date.now() - 60000) } // Within last minute
    });
    
    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait 1 minute before requesting a new OTP' 
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_VALIDITY_MINUTES) || 5) * 60000);
    
    // Save OTP to database
    const otpData = {
      otp,
      type: 'registration',
      expiresAt,
      method: preferEmail ? 'email' : 'sms'
    };
    
    if (formattedPhone) otpData.phone = formattedPhone;
    if (formattedEmail) otpData.email = formattedEmail;
    
    await OTP.create(otpData);
    
    // Send OTP via notification service
    const result = await notificationService.sendOTP(
      formattedPhone, 
      formattedEmail, 
      'User', 
      otp, 
      preferEmail
    );
    
    console.log(`🔐 OTP generated for ${identifier}: ${otp}`);
    
    res.json({ 
      success: true,
      message: result.method === 'email' 
        ? 'OTP sent successfully to your email' 
        : result.method === 'sms'
        ? 'OTP sent successfully to your mobile number'
        : 'OTP generated (check console for development)',
      method: result.method,
      identifier: preferEmail ? formattedEmail : formattedPhone,
      expiryTime: process.env.OTP_VALIDITY_MINUTES || 5
    });
    
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ 
      message: 'Failed to send OTP. Please try again later.' 
    });
  }
});

// ============================================
// VERIFY OTP AND REGISTER USER
// ============================================
router.post('/verify-otp', async (req, res) => {
  try {
    let { phone, email, otp, name, password } = req.body;
    
    // Validate required fields
    if (!otp || !name || !password) {
      return res.status(400).json({ 
        message: 'OTP, name and password are required' 
      });
    }
    
    if (!phone && !email) {
      return res.status(400).json({ 
        message: 'Phone or email is required' 
      });
    }
    
    // Format identifiers
    const formattedPhone = phone ? formatPhoneNumber(phone) : null;
    const formattedEmail = email ? email.trim().toLowerCase() : null;
    
    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ 
        message: 'Please enter a valid 6-digit OTP' 
      });
    }
    
    // Validate name
    name = name.trim();
    if (name.length < 2) {
      return res.status(400).json({ 
        message: 'Name must be at least 2 characters long' 
      });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }
    
    // Find valid OTP
    const otpQuery = {
      otp,
      type: 'registration',
      expiresAt: { $gt: new Date() }
    };

    // Normalize phone variants to be tolerant of +91 / 0 / plain 10-digit formats
    if (formattedPhone) {
      const variants = new Set();
      variants.add(formattedPhone);
      const withoutPlus = formattedPhone.replace(/^\+91/, '');
      variants.add(withoutPlus);
      if (withoutPlus.length === 10) variants.add('0' + withoutPlus);

      // If email also present, allow either phone variants OR the email
      if (formattedEmail) {
        otpQuery.$or = [
          { email: formattedEmail },
          { phone: { $in: Array.from(variants) } }
        ];
      } else {
        otpQuery.phone = { $in: Array.from(variants) };
      }
    } else if (formattedEmail) {
      otpQuery.email = formattedEmail;
    }

    const otpRecord = await OTP.findOne(otpQuery).sort({ createdAt: -1 });
    
    if (!otpRecord) {
  // Check if OTP exists but expired
  const expiredQuery = JSON.parse(JSON.stringify(otpQuery));
  delete expiredQuery.expiresAt;
  const expiredOTP = await OTP.findOne(expiredQuery);
      
      if (expiredOTP) {
        return res.status(400).json({ 
          message: 'OTP has expired. Please request a new one.' 
        });
      }
      
      return res.status(400).json({ 
        message: 'Invalid OTP. Please check and try again.' 
      });
    }
    
    // Check if user already exists
    const existingUserQuery = { $or: [] };
    if (formattedPhone) existingUserQuery.$or.push({ phone: formattedPhone });
    if (formattedEmail) existingUserQuery.$or.push({ email: formattedEmail });
    
    const existingUser = await User.findOne(existingUserQuery);
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ 
        message: 'Account already exists. Please login.' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if this is admin
    const isAdmin = formattedPhone === process.env.ADMIN_PHONE || formattedEmail === process.env.ADMIN_EMAIL;
    
    // Create user object
    const userData = {
      name,
      password: hashedPassword,
      isAdmin,
      isVerified: true,
      isBlocked: false
    };
    
    // Add phone if provided
    if (formattedPhone) {
      userData.phone = formattedPhone;
    }
    
    // Add email if provided
    if (formattedEmail) {
      userData.email = formattedEmail;
    }
    
    // Create or update user
    let user;
    if (existingUser) {
      // Update existing unverified user
      Object.assign(existingUser, userData);
      user = await existingUser.save();
    } else {
      // Create new user
      user = await User.create(userData);
    }
    
    // Delete all OTPs for this user
    const deleteQuery = {};
    if (formattedPhone) deleteQuery.phone = formattedPhone;
    if (formattedEmail) deleteQuery.email = formattedEmail;
    await OTP.deleteMany(deleteQuery);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Send welcome email if email provided
    if (formattedEmail) {
      emailService.sendEmail(formattedEmail, {
        subject: 'Welcome to Eswari Physiotherapy',
        html: `
          <h2>Welcome ${name}!</h2>
          <p>Your account has been successfully created.</p>
          <p>You can now book appointments online.</p>
          <p>Contact us: ${process.env.ADMIN_PHONE}</p>
        `
      }).catch(console.error);
    }
    
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone || null,
        email: user.email || null,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Verify OTP Error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `This ${field} is already registered` 
      });
    }
    
    res.status(500).json({ 
      message: 'Registration failed. Please try again.' 
    });
  }
});

// ============================================
// LOGIN WITH PHONE/EMAIL AND PASSWORD
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({ 
        message: 'Please enter your phone number/email and password' 
      });
    }
    
    const cleanIdentifier = identifier.trim();
    
    // Find user by phone or email
    let user;
    
    if (cleanIdentifier.includes('@')) {
      // Login with email
      const email = cleanIdentifier.toLowerCase();
      if (!validateEmail(email)) {
        return res.status(400).json({ 
          message: 'Please enter a valid email address' 
        });
      }
      user = await User.findOne({ email });
    } else {
      // Login with phone
      const phone = formatPhoneNumber(cleanIdentifier);
      if (!validateIndianPhone(phone)) {
        return res.status(400).json({ 
          message: 'Please enter a valid phone number' 
        });
      }
      user = await User.findOne({ phone });
    }
    
    // Check if user exists
    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid credentials. Please check your phone/email and password.' 
      });
    }
    
    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Your account is not verified. Please complete registration.' 
      });
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: `Your account has been blocked. Please contact admin: ${process.env.ADMIN_PHONE}` 
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        message: 'Invalid credentials. Please check your phone/email and password.' 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone || null,
        email: user.email || null,
        isAdmin: user.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      message: 'Login failed. Please try again.' 
    });
  }
});

// ============================================
// FORGOT PASSWORD - SEND OTP (Email preferred)
// ============================================
router.post('/forgot-password', async (req, res) => {
  try {
    let { phone, email, preferEmail = true } = req.body; // Default to email for password reset
    
    // Must have either phone or email
    if (!phone && !email) {
      return res.status(400).json({ 
        message: 'Phone number or email is required' 
      });
    }
    
    let user;
    let identifier = '';
    let formattedPhone = '';
    let formattedEmail = '';
    
    // Check by email first if provided
    if (email) {
      formattedEmail = email.trim().toLowerCase();
      identifier = formattedEmail;
      
      if (!validateEmail(formattedEmail)) {
        return res.status(400).json({ 
          message: 'Please enter a valid email address' 
        });
      }
      
      user = await User.findOne({ email: formattedEmail });
    }
    
    // If no email or user not found by email, check phone
    if (!user && phone) {
      formattedPhone = formatPhoneNumber(phone);
      identifier = formattedPhone;
      
      if (!validateIndianPhone(formattedPhone)) {
        return res.status(400).json({ 
          message: 'Please enter a valid Indian phone number' 
        });
      }
      
      user = await User.findOne({ phone: formattedPhone });
    }
    
    // Check if user exists
    if (!user) {
      return res.status(404).json({ 
        message: 'No account found with this phone number or email' 
      });
    }
    
    // Use user's actual email and phone
    formattedEmail = user.email || formattedEmail;
    formattedPhone = user.phone || formattedPhone;
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: `Your account is blocked. Contact admin: ${process.env.ADMIN_PHONE}` 
      });
    }
    
    // Clean expired OTPs
    await cleanExpiredOTPs(identifier);
    
    // Check OTP limit
    const canSendOTP = await checkOTPLimit(identifier);
    if (!canSendOTP) {
      return res.status(429).json({ 
        message: `Maximum OTP limit reached for today. Please try again tomorrow.` 
      });
    }
    
    // Check for recent OTP
    const recentOTPQuery = {};
    if (formattedPhone) recentOTPQuery.phone = formattedPhone;
    if (formattedEmail) recentOTPQuery.email = formattedEmail;
    
    const recentOTP = await OTP.findOne({
      ...recentOTPQuery,
      type: 'password_reset',
      createdAt: { $gt: new Date(Date.now() - 60000) }
    });
    
    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait 1 minute before requesting a new OTP' 
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_VALIDITY_MINUTES) || 5) * 60000);
    
    // Save OTP
    const otpData = {
      otp,
      type: 'password_reset',
      expiresAt,
      method: formattedEmail && preferEmail ? 'email' : 'sms'
    };
    
    if (formattedPhone) otpData.phone = formattedPhone;
    if (formattedEmail) otpData.email = formattedEmail;
    
    await OTP.create(otpData);
    
    // Send OTP via notification service (prefer email for password reset)
    const result = await notificationService.sendOTP(
      formattedPhone, 
      formattedEmail, 
      user.name, 
      otp, 
      preferEmail && !!formattedEmail
    );
    
    console.log(`🔐 Password reset OTP for ${identifier}: ${otp}`);
    
    res.json({ 
      success: true,
      message: result.method === 'email'
        ? 'OTP sent to your registered email'
        : result.method === 'sms'
        ? 'OTP sent to your registered phone number'
        : 'OTP generated (check console)',
      method: result.method,
      identifier: result.method === 'email' ? formattedEmail : formattedPhone,
      expiryTime: process.env.OTP_VALIDITY_MINUTES || 5
    });
    
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ 
      message: 'Failed to process request. Please try again.' 
    });
  }
});

// ============================================
// RESET PASSWORD WITH OTP
// ============================================
router.post('/reset-password', async (req, res) => {
  try {
    let { phone, email, otp, newPassword } = req.body;
    
    // Validate input
    if (!otp || !newPassword) {
      return res.status(400).json({ 
        message: 'OTP and new password are required' 
      });
    }
    
    if (!phone && !email) {
      return res.status(400).json({ 
        message: 'Phone or email is required' 
      });
    }
    
    // Format identifiers
    const formattedPhone = phone ? formatPhoneNumber(phone) : null;
    const formattedEmail = email ? email.trim().toLowerCase() : null;
    
    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ 
        message: 'Please enter a valid 6-digit OTP' 
      });
    }
    
    // Validate password
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long' 
      });
    }
    
    // Find valid OTP
    const otpQuery = {
      otp,
      type: 'password_reset',
      expiresAt: { $gt: new Date() }
    };

    if (formattedPhone) {
      const variants = new Set();
      variants.add(formattedPhone);
      const withoutPlus = formattedPhone.replace(/^\+91/, '');
      variants.add(withoutPlus);
      if (withoutPlus.length === 10) variants.add('0' + withoutPlus);

      if (formattedEmail) {
        otpQuery.$or = [
          { email: formattedEmail },
          { phone: { $in: Array.from(variants) } }
        ];
      } else {
        otpQuery.phone = { $in: Array.from(variants) };
      }
    } else if (formattedEmail) {
      otpQuery.email = formattedEmail;
    }

    const otpRecord = await OTP.findOne(otpQuery).sort({ createdAt: -1 });
    
    if (!otpRecord) {
  // Check if OTP expired
  const expiredQuery = JSON.parse(JSON.stringify(otpQuery));
  delete expiredQuery.expiresAt;
  const expiredOTP = await OTP.findOne(expiredQuery);
      
      if (expiredOTP) {
        return res.status(400).json({ 
          message: 'OTP has expired. Please request a new one.' 
        });
      }
      
      return res.status(400).json({ 
        message: 'Invalid OTP. Please check and try again.' 
      });
    }
    
    // Find user
    const userQuery = { $or: [] };
    if (formattedPhone) userQuery.$or.push({ phone: formattedPhone });
    if (formattedEmail) userQuery.$or.push({ email: formattedEmail });
    
    const user = await User.findOne(userQuery);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }
    
    // Check if new password is same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        message: 'New password cannot be the same as your current password' 
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    // Delete all password reset OTPs for this user
    const deleteQuery = { type: 'password_reset' };
    if (formattedPhone) deleteQuery.phone = formattedPhone;
    if (formattedEmail) deleteQuery.email = formattedEmail;
    await OTP.deleteMany(deleteQuery);
    
    // Send confirmation email if available
    if (user.email) {
      emailService.sendEmail(user.email, {
        subject: 'Password Reset Successful',
        html: `
          <h2>Password Reset Successful</h2>
          <p>Hi ${user.name},</p>
          <p>Your password has been successfully reset.</p>
          <p>If you didn't make this change, please contact us immediately.</p>
          <p>Contact: ${process.env.ADMIN_PHONE}</p>
        `
      }).catch(console.error);
    }
    
    res.json({ 
      success: true,
      message: 'Password reset successfully. You can now login with your new password.' 
    });
    
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ 
      message: 'Failed to reset password. Please try again.' 
    });
  }
});

// ============================================
// RESEND OTP
// ============================================
router.post('/resend-otp', async (req, res) => {
  try {
    let { phone, email, type = 'registration', preferEmail = false } = req.body;
    
    if (!phone && !email) {
      return res.status(400).json({ 
        message: 'Phone number or email is required' 
      });
    }
    
    // Format identifiers
    const formattedPhone = phone ? formatPhoneNumber(phone) : null;
    const formattedEmail = email ? email.trim().toLowerCase() : null;
    
    // Check for recent OTP
    const recentOTPQuery = { type };
    if (formattedPhone) recentOTPQuery.phone = formattedPhone;
    if (formattedEmail) recentOTPQuery.email = formattedEmail;
    
    const recentOTP = await OTP.findOne({
      ...recentOTPQuery,
      createdAt: { $gt: new Date(Date.now() - 60000) }
    });
    
    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait 1 minute before requesting a new OTP' 
      });
    }
    
    // Check OTP limit
    const identifier = preferEmail ? formattedEmail : (formattedPhone || formattedEmail);
    const canSendOTP = await checkOTPLimit(identifier);
    if (!canSendOTP) {
      return res.status(429).json({ 
        message: 'Maximum OTP limit reached for today' 
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_VALIDITY_MINUTES) || 5) * 60000);
    
    // Save OTP
    const otpData = {
      otp,
      type,
      expiresAt,
      method: preferEmail ? 'email' : 'sms'
    };
    
    if (formattedPhone) otpData.phone = formattedPhone;
    if (formattedEmail) otpData.email = formattedEmail;
    
    await OTP.create(otpData);
    
    // Send OTP
    const result = await notificationService.sendOTP(
      formattedPhone, 
      formattedEmail, 
      'User', 
      otp, 
      preferEmail
    );
    
    console.log(`📱 OTP resent to ${identifier}: ${otp}`);
    
    res.json({ 
      success: true,
      message: result.method === 'email'
        ? 'OTP resent to your email'
        : result.method === 'sms'
        ? 'OTP resent to your phone'
        : 'OTP generated (check console)',
      method: result.method,
      identifier,
      expiryTime: process.env.OTP_VALIDITY_MINUTES || 5
    });
    
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ 
      message: 'Failed to resend OTP' 
    });
  }
});

// ============================================
// GET CURRENT USER
// ============================================
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        phone: req.user.phone || null,
        email: req.user.email || null,
        isAdmin: req.user.isAdmin,
        isVerified: req.user.isVerified,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ 
      message: 'Failed to get user information' 
    });
  }
});

// ============================================
// UPDATE USER PROFILE
// ============================================
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const userId = req.user._id;
    
    const updates = {};
    
    // Update name if provided
    if (name) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        return res.status(400).json({ 
          message: 'Name must be at least 2 characters long' 
        });
      }
      updates.name = trimmedName;
    }
    
    // Update email if provided
    if (email !== undefined) {
      if (email === '') {
        // Allow removing email
        updates.email = null;
      } else {
        const trimmedEmail = email.trim().toLowerCase();
        if (!validateEmail(trimmedEmail)) {
          return res.status(400).json({ 
            message: 'Please enter a valid email address' 
          });
        }
        
        // Check if email already exists
        const existingEmail = await User.findOne({ 
          email: trimmedEmail,
          _id: { $ne: userId }
        });
        
        if (existingEmail) {
          return res.status(400).json({ 
            message: 'This email is already registered with another account' 
          });
        }
        
        updates.email = trimmedEmail;
      }
    }
    
    // Update phone if provided
    if (phone !== undefined) {
      if (phone === '') {
        // Don't allow removing phone if it's the only identifier
        if (!req.user.email && !email) {
          return res.status(400).json({ 
            message: 'Cannot remove phone number without an email address' 
          });
        }
        updates.phone = null;
      } else {
        const formattedPhone = formatPhoneNumber(phone);
        if (!validateIndianPhone(formattedPhone)) {
          return res.status(400).json({ 
            message: 'Please enter a valid phone number' 
          });
        }
        
        // Check if phone already exists
        const existingPhone = await User.findOne({ 
          phone: formattedPhone,
          _id: { $ne: userId }
        });
        
        if (existingPhone) {
          return res.status(400).json({ 
            message: 'This phone number is already registered' 
          });
        }
        
        updates.phone = formattedPhone;
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        phone: updatedUser.phone || null,
        email: updatedUser.email || null,
        isAdmin: updatedUser.isAdmin
      }
    });
    
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ 
      message: 'Failed to update profile' 
    });
  }
});

// ============================================
// CHANGE PASSWORD (Logged in users)
// ============================================
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Current password and new password are required' 
      });
    }
    
    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long' 
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      });
    }
    
    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    
    // Send confirmation email if available
    if (user.email) {
      emailService.sendEmail(user.email, {
        subject: 'Password Changed Successfully',
        html: `
          <h2>Password Changed</h2>
          <p>Hi ${user.name},</p>
          <p>Your password has been successfully changed.</p>
          <p>If you didn't make this change, please contact us immediately.</p>
          <p>Contact: ${process.env.ADMIN_PHONE}</p>
        `
      }).catch(console.error);
    }
    
    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
    
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ 
      message: 'Failed to change password' 
    });
  }
});

// ============================================
// LOGOUT (Optional - for token blacklisting)
// ============================================
router.post('/logout', auth, async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token here
    // For now, we'll just send a success response
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({ 
      message: 'Logout failed' 
    });
  }
});

module.exports = router;