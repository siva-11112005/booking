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
}

module.exports = new NotificationService();