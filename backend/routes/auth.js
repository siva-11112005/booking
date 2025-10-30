const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { auth } = require('../middleware/auth');
const msg91Service = require('../utils/msg91Service');
const emailService = require('../utils/emailService');
const notificationService = require('../utils/notificationService');

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
const checkOTPLimit = async (phone) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const count = await OTP.countDocuments({
    phone,
    createdAt: { 
      $gte: today,
      $lt: tomorrow
    }
  });
  
  const maxOTPPerDay = parseInt(process.env.MAX_OTP_PER_DAY) || 5;
  return count < maxOTPPerDay;
};

// Clean expired OTPs
const cleanExpiredOTPs = async (phone) => {
  await OTP.deleteMany({
    phone,
    expiresAt: { $lt: new Date() }
  });
};

// ============================================
// SEND OTP FOR REGISTRATION
// ============================================
router.post('/send-otp', async (req, res) => {
  try {
    let { phone } = req.body;
    
    // Validate input
    if (!phone) {
      return res.status(400).json({ 
        message: 'Phone number is required' 
      });
    }
    
    // Format and validate phone number
    phone = formatPhoneNumber(phone);
    
    if (!validateIndianPhone(phone)) {
      return res.status(400).json({ 
        message: 'Please enter a valid 10-digit Indian mobile number' 
      });
    }
    
    // Clean expired OTPs
    await cleanExpiredOTPs(phone);
    
    // Check daily OTP limit
    const canSendOTP = await checkOTPLimit(phone);
    if (!canSendOTP) {
      return res.status(429).json({ 
        message: `Maximum OTP limit reached for today (${process.env.MAX_OTP_PER_DAY || 5} OTPs). Please try again tomorrow.` 
      });
    }
    
    // Check if phone already registered
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ 
        message: 'This phone number is already registered. Please login instead.' 
      });
    }
    
    // Check if there's a recent OTP (prevent spam)
    const recentOTP = await OTP.findOne({
      phone,
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
    await OTP.create({
      phone,
      otp,
      type: 'registration',
      expiresAt
    });
    
    // Send OTP via MSG91
    await msg91Service.sendOTP(phone, otp);
    
    console.log(`📱 OTP sent to ${phone}: ${otp}`);
    
    res.json({ 
      success: true,
      message: 'OTP sent successfully to your mobile number',
      phone,
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
    let { phone, otp, name, password, email } = req.body;
    
    // Validate required fields
    if (!phone || !otp || !name || !password) {
      return res.status(400).json({ 
        message: 'Phone, OTP, name and password are required' 
      });
    }
    
    // Format phone number
    phone = formatPhoneNumber(phone);
    
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
    
    // Validate email if provided
    if (email) {
      email = email.trim().toLowerCase();
      if (!validateEmail(email)) {
        return res.status(400).json({ 
          message: 'Please enter a valid email address' 
        });
      }
      
      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ 
          message: 'This email is already registered with another account' 
        });
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
      // Check if OTP exists but expired
      const expiredOTP = await OTP.findOne({
        phone,
        otp,
        type: 'registration'
      });
      
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
    const existingUser = await User.findOne({ phone });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ 
        message: 'Phone number already registered. Please login.' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if this is admin phone
    const isAdmin = phone === process.env.ADMIN_PHONE;
    
    // Create user object
    const userData = {
      name,
      phone,
      password: hashedPassword,
      isAdmin,
      isVerified: true,
      isBlocked: false
    };
    
    // Add email if provided
    if (email) {
      userData.email = email;
    }
    
    // Create or update user
    let user;
    if (existingUser) {
      // Update existing unverified user
      user = await User.findOneAndUpdate(
        { phone },
        userData,
        { new: true }
      );
    } else {
      // Create new user
      user = await User.create(userData);
    }
    
    // Delete all OTPs for this phone
    await OTP.deleteMany({ phone });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // Send welcome email if email provided
    if (email) {
      emailService.sendEmail(email, {
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
        phone: user.phone,
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
        phone: user.phone,
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
// FORGOT PASSWORD - SEND OTP
// ============================================
router.post('/forgot-password', async (req, res) => {
  try {
    let { phone } = req.body;
    
    // Validate input
    if (!phone) {
      return res.status(400).json({ 
        message: 'Phone number is required' 
      });
    }
    
    // Format phone number
    phone = formatPhoneNumber(phone);
    
    if (!validateIndianPhone(phone)) {
      return res.status(400).json({ 
        message: 'Please enter a valid Indian phone number' 
      });
    }
    
    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ 
        message: 'No account found with this phone number' 
      });
    }
    
    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: `Your account is blocked. Contact admin: ${process.env.ADMIN_PHONE}` 
      });
    }
    
    // Clean expired OTPs
    await cleanExpiredOTPs(phone);
    
    // Check OTP limit
    const canSendOTP = await checkOTPLimit(phone);
    if (!canSendOTP) {
      return res.status(429).json({ 
        message: `Maximum OTP limit reached for today. Please try again tomorrow.` 
      });
    }
    
    // Check for recent OTP
    const recentOTP = await OTP.findOne({
      phone,
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
    await OTP.create({
      phone,
      otp,
      type: 'password_reset',
      expiresAt
    });
    
    // Send OTP via MSG91 and email
    await notificationService.sendOTP(phone, user.email, user.name, otp);
    
    console.log(`🔐 Password reset OTP sent to ${phone}: ${otp}`);
    
    res.json({ 
      success: true,
      message: 'OTP sent successfully for password reset',
      phone,
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
    let { phone, otp, newPassword } = req.body;
    
    // Validate input
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ 
        message: 'Phone, OTP and new password are required' 
      });
    }
    
    // Format phone number
    phone = formatPhoneNumber(phone);
    
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
    const otpRecord = await OTP.findOne({
      phone,
      otp,
      type: 'password_reset',
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    
    if (!otpRecord) {
      // Check if OTP expired
      const expiredOTP = await OTP.findOne({
        phone,
        otp,
        type: 'password_reset'
      });
      
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
    const user = await User.findOne({ phone });
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
    
    // Delete all password reset OTPs for this phone
    await OTP.deleteMany({ phone, type: 'password_reset' });
    
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
    let { phone, type = 'registration' } = req.body;
    
    if (!phone) {
      return res.status(400).json({ 
        message: 'Phone number is required' 
      });
    }
    
    // Format phone number
    phone = formatPhoneNumber(phone);
    
    // Check for recent OTP
    const recentOTP = await OTP.findOne({
      phone,
      type,
      createdAt: { $gt: new Date(Date.now() - 60000) }
    });
    
    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait 1 minute before requesting a new OTP' 
      });
    }
    
    // Check OTP limit
    const canSendOTP = await checkOTPLimit(phone);
    if (!canSendOTP) {
      return res.status(429).json({ 
        message: 'Maximum OTP limit reached for today' 
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_VALIDITY_MINUTES) || 5) * 60000);
    
    // Save OTP
    await OTP.create({
      phone,
      otp,
      type,
      expiresAt
    });
    
    // Send OTP
    await msg91Service.sendOTP(phone, otp);
    
    console.log(`📱 OTP resent to ${phone}: ${otp}`);
    
    res.json({ 
      success: true,
      message: 'OTP resent successfully',
      phone,
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
        phone: req.user.phone,
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
    const { name, email } = req.body;
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
        phone: updatedUser.phone,
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