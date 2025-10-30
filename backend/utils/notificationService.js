const msg91Service = require('./msg91Service');
const emailService = require('./emailService');

class NotificationService {
  // Send OTP via both SMS and Email
  async sendOTP(phone, email, name, otp) {
    const promises = [];
    
    // Always send SMS
    promises.push(msg91Service.sendOTP(phone, otp));
    
    // Send email if provided
    if (email) {
      promises.push(emailService.sendOTPEmail(email, name, otp));
    }
    
    await Promise.allSettled(promises);
    return true;
  }

  // Send booking confirmation via both channels
  async sendBookingConfirmation(phone, email, name, date, time, painType) {
    const promises = [];
    
    // Always send SMS
    promises.push(msg91Service.sendBookingConfirmation(phone, date, time));
    
    // Send email if provided
    if (email) {
      promises.push(emailService.sendBookingConfirmationEmail(email, name, date, time, painType));
    }
    
    await Promise.allSettled(promises);
    return true;
  }

  // Send cancellation notice via both channels
  async sendCancellationNotice(phone, email, name, date, time) {
    const promises = [];
    
    // Always send SMS
    promises.push(msg91Service.sendCancellationNotice(phone));
    
    // Send email if provided
    if (email && date && time) {
      promises.push(emailService.sendCancellationEmail(email, name, date, time));
    }
    
    await Promise.allSettled(promises);
    return true;
  }
}

module.exports = new NotificationService();