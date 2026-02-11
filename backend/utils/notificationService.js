const smsGatewayService = require('./smsGatewayService');
const emailService = require('./emailService');

class NotificationService {
  // ============================================
  // Send OTP with SMS Gateway and Email Fallback
  // ============================================
  async sendOTP(phone, email, name, otp, preferEmail = false) {
    console.log('\n═══════════════════════════════════════');
    console.log('📤 SENDING OTP');
    console.log('═══════════════════════════════════════');
    console.log('📱 Phone:', phone || 'Not provided');
    console.log('📧 Email:', email || 'Not provided');
    console.log('🔐 OTP:', otp);
    console.log('📨 Prefer Email:', preferEmail ? 'Yes' : 'No');
    console.log('═══════════════════════════════════════\n');

    // Always log OTP in console for development
    console.log('');
    console.log('🔐'.repeat(30));
    console.log('DEVELOPMENT MODE - OTP CODE: ' + otp);
    console.log('Valid for: 5 minutes');
    console.log('Use this code if SMS/Email fails');
    console.log('🔐'.repeat(30));
    console.log('');

    const results = {
      sms: false,
      email: false,
      otpSent: false,
      method: null
    };

    // If user prefers email or no phone provided, send via email
    if (preferEmail && email) {
      console.log('📧 User prefers Email OTP...');
      try {
        await emailService.sendOTPEmail(email, name, otp);
        results.email = true;
        results.otpSent = true;
        results.method = 'email';
        console.log('✅ OTP sent via Email successfully');
        return results;
      } catch (error) {
        console.error('❌ Email failed:', error.message);
      }
    }

    // Try SMS Gateway first
    if (!preferEmail && phone) {
      console.log('📱 Attempting SMS via SMS Gateway (FREE)...');
      try {
        const smsResult = await smsGatewayService.sendOTP(phone, otp);
        
        if (smsResult.success) {
          results.sms = true;
          results.otpSent = true;
          results.method = 'sms';
          console.log('✅ SMS sent successfully via SMS Gateway');
          return results;
        } else {
          console.log('⚠️  SMS Gateway failed, will try email fallback');
        }
      } catch (error) {
        console.error('❌ SMS Error:', error.message);
      }
    }
    
    // Fallback to Email if SMS fails
    if (email && !results.otpSent) {
      console.log('📧 Falling back to Email...');
      try {
        await emailService.sendOTPEmail(email, name, otp);
        results.email = true;
        results.otpSent = true;
        results.method = 'email';
        console.log('✅ OTP sent via Email (fallback)');
      } catch (error) {
        console.error('❌ Email Error:', error.message);
      }
    }

    // If nothing worked, still return success (OTP is logged in console)
    if (!results.otpSent) {
      console.log('⚠️  All methods failed. Use OTP from console above.');
      results.method = 'console';
      results.otpSent = true; // Allow user to proceed with console OTP
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 NOTIFICATION RESULTS:');
    console.log('   SMS:', results.sms ? '✅ Sent' : '❌ Failed');
    console.log('   Email:', results.email ? '✅ Sent' : email ? '❌ Failed' : '⚠️ Not available');
    console.log('   Method Used:', results.method || 'console');
    console.log('   Console:', '✅ OTP logged above');
    console.log('═══════════════════════════════════════\n');
    
    return results;
  }

  // ============================================
  // Send Booking Confirmation
  // ============================================
  async sendBookingConfirmation(phone, email, name, date, time, painType) {
    console.log('\n═══════════════════════════════════════');
    console.log('📅 SENDING BOOKING CONFIRMATION');
    console.log('═══════════════════════════════════════');
    console.log('📱 Phone:', phone || 'Not provided');
    console.log('📧 Email:', email || 'Not provided');
    console.log('📅 Date:', date);
    console.log('⏰ Time:', time);
    console.log('═══════════════════════════════════════\n');
    
    const results = { sms: false, email: false };

    // Try SMS
    if (phone) {
      console.log('📱 Attempting SMS...');
      try {
        const smsResult = await smsGatewayService.sendBookingConfirmation(phone, date, time);
        results.sms = smsResult.success;
        if (smsResult.success) {
          console.log('✅ SMS sent successfully');
        } else {
          console.log('❌ SMS failed:', smsResult.error);
        }
      } catch (error) {
        console.error('❌ SMS Error:', error.message);
      }
    }
    
    // Always send email if available
    if (email) {
      console.log('📧 Attempting Email...');
      try {
        await emailService.sendBookingConfirmationEmail(email, name, date, time, painType);
        results.email = true;
        console.log('✅ Email sent successfully');
      } catch (error) {
        console.error('❌ Email Error:', error.message);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 NOTIFICATION RESULTS:');
    console.log('   SMS:', results.sms ? '✅ Sent' : phone ? '❌ Failed' : '⚠️ Not provided');
    console.log('   Email:', results.email ? '✅ Sent' : email ? '❌ Failed' : '⚠️ Not provided');
    console.log('═══════════════════════════════════════\n');

    return results;
  }

  // ============================================
  // Send Cancellation Notice
  // ============================================
  async sendCancellationNotice(phone, email, name, date, time) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ SENDING CANCELLATION NOTICE');
    console.log('═══════════════════════════════════════');
    console.log('📱 Phone:', phone || 'Not provided');
    console.log('📧 Email:', email || 'Not provided');
    console.log('═══════════════════════════════════════\n');
    
    const results = { sms: false, email: false };

    // Try SMS
    if (phone) {
      console.log('📱 Attempting SMS...');
      try {
        const smsResult = await smsGatewayService.sendCancellationNotice(phone);
        results.sms = smsResult.success;
        if (smsResult.success) {
          console.log('✅ SMS sent successfully');
        } else {
          console.log('❌ SMS failed:', smsResult.error);
        }
      } catch (error) {
        console.error('❌ SMS Error:', error.message);
      }
    }
    
    // Always send email if available
    if (email && date && time) {
      console.log('📧 Attempting Email...');
      try {
        await emailService.sendCancellationEmail(email, name, date, time);
        results.email = true;
        console.log('✅ Email sent successfully');
      } catch (error) {
        console.error('❌ Email Error:', error.message);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 NOTIFICATION RESULTS:');
    console.log('   SMS:', results.sms ? '✅ Sent' : phone ? '❌ Failed' : '⚠️ Not provided');
    console.log('   Email:', results.email ? '✅ Sent' : email ? '❌ Failed' : '⚠️ Not provided');
    console.log('═══════════════════════════════════════\n');

    return results;
  }

  // ============================================
  // Send Account Update Notification (Email Only)
  // ============================================
  async sendAccountUpdateEmail(email, name, updateType, details = {}) {
    console.log('\n═══════════════════════════════════════');
    console.log('📧 SENDING ACCOUNT UPDATE NOTIFICATION');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', email || 'Not provided');
    console.log('📝 Update Type:', updateType);
    console.log('═══════════════════════════════════════\n');
    
    const results = { email: false };

    if (!email) {
      console.log('⚠️  Email not provided');
      return results;
    }
    
    try {
      let emailSubject = 'Account Update - Eswari Physiotherapy';
      let emailContent = '';

      switch(updateType) {
        case 'profile_updated':
          emailSubject = '✏️ Your Profile Has Been Updated - Eswari Physiotherapy';
          emailContent = `Hi ${name},\n\nYour profile information has been updated successfully.\n\nUpdated Fields:\n${details.fields ? details.fields.join(', ') : 'Profile'}\n\nIf you didn't make this change, please contact us immediately.\n\nContact: ${process.env.ADMIN_PHONE}`;
          break;
        case 'password_changed':
          emailSubject = '🔒 Your Password Has Been Changed - Eswari Physiotherapy';
          emailContent = `Hi ${name},\n\nYour password has been successfully changed.\n\nIf you didn't make this change, please contact us immediately.\n\nContact: ${process.env.ADMIN_PHONE}`;
          break;
        case 'email_updated':
          emailSubject = '📧 Your Email Has Been Updated - Eswari Physiotherapy';
          emailContent = `Hi ${name},\n\nYour email address has been successfully updated to: ${details.newEmail}\n\nIf you didn't make this change, please contact us immediately.\n\nContact: ${process.env.ADMIN_PHONE}`;
          break;
        case 'phone_updated':
          emailSubject = '📱 Your Phone Number Has Been Updated - Eswari Physiotherapy';
          emailContent = `Hi ${name},\n\nYour phone number has been successfully updated.\n\nIf you didn't make this change, please contact us immediately.\n\nContact: ${process.env.ADMIN_PHONE}`;
          break;
        default:
          emailContent = `Hi ${name},\n\nYour account has been updated: ${updateType}`;
      }

      await emailService.sendGenericEmail(
        email,
        emailSubject,
        emailContent
      );

      results.email = true;
      console.log('✅ Account update email sent successfully');
    } catch (error) {
      console.error('❌ Email Error:', error.message);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 NOTIFICATION RESULTS:');
    console.log('   Email:', results.email ? '✅ Sent' : '❌ Failed');
    console.log('═══════════════════════════════════════\n');

    return results;
  }

  // ============================================
  // Send Login Alert Email
  // ============================================
  async sendLoginAlertEmail(email, name, loginDetails = {}) {
    console.log('\n═══════════════════════════════════════');
    console.log('🔐 SENDING LOGIN ALERT');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:', email || 'Not provided');
    console.log('═══════════════════════════════════════\n');
    
    const results = { email: false };

    if (!email) {
      console.log('⚠️  Email not provided');
      return results;
    }
    
    try {
      const timestamp = loginDetails.timestamp || new Date().toLocaleString('en-IN');
      const device = loginDetails.device || 'Web Browser';

      await emailService.sendGenericEmail(
        email,
        '🔐 New Login Alert - Eswari Physiotherapy',
        `Hi ${name},\n\nA new login was detected on your account.\n\nLogin Details:\n- Time: ${timestamp}\n- Device: ${device}\n\nIf this wasn't you, please change your password immediately.\n\nChange Password: https://booking-fskl.onrender.com/forgot-password\n\nNeed Help? Contact: ${process.env.ADMIN_PHONE}`
      );

      results.email = true;
      console.log('✅ Login alert email sent successfully');
    } catch (error) {
      console.error('❌ Email Error:', error.message);
    }

    return results;
  }
}

module.exports = new NotificationService();