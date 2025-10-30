const axios = require('axios');

class MSG91Service {
  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY;
    this.senderId = process.env.MSG91_SENDER_ID;
    this.baseURL = 'https://control.msg91.com/api/v5';
    this.otpTemplateId = process.env.MSG91_OTP_TEMPLATE_ID;
    this.bookingTemplateId = process.env.MSG91_BOOKING_TEMPLATE_ID;
    this.cancellationTemplateId = process.env.MSG91_CANCELLATION_TEMPLATE_ID;
  }

  // Send OTP using MSG91 OTP service
  async sendOTP(phone, otp) {
    try {
      // Remove +91 if present for MSG91
      const mobileNumber = phone.replace('+91', '');
      
      const url = `${this.baseURL}/otp`;
      const data = {
        template_id: this.otpTemplateId,
        mobile: '91' + mobileNumber,
        authkey: this.authKey,
        otp: otp,
        sender: this.senderId,
        otp_expiry: 5, // 5 minutes
        otp_length: 6
      };

      console.log('📱 Sending OTP via MSG91:');
      console.log('   Phone:', phone);
      console.log('   OTP:', otp);
      
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
          'authkey': this.authKey
        }
      });

      if (response.data.type === 'success') {
        console.log('✅ OTP sent successfully via MSG91');
        return true;
      }
      
      throw new Error(response.data.message || 'MSG91 error');
      
    } catch (error) {
      console.error('❌ MSG91 OTP Error:', error.message);
      
      // Log OTP for development
      console.log('');
      console.log('═'.repeat(60));
      console.log('🔐 OTP FOR TESTING:');
      console.log('   Phone:', phone);
      console.log('   OTP:', otp);
      console.log('   Valid for: 5 minutes');
      console.log('═'.repeat(60));
      console.log('');
      
      return true; // Continue even if SMS fails
    }
  }

  // Send template SMS using MSG91 Flow API
  async sendTemplateSMS(phone, templateId, variables) {
    try {
      const mobileNumber = phone.replace('+91', '');
      
      const url = `${this.baseURL}/flow`;
      const data = {
        template_id: templateId,
        sender: this.senderId,
        mobiles: '91' + mobileNumber,
        ...variables
      };

      const response = await axios.post(url, data, {
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.type === 'success') {
        console.log('✅ Template SMS sent successfully');
        return true;
      }
      
      throw new Error(response.data.message || 'MSG91 error');
      
    } catch (error) {
      console.error('❌ MSG91 Template SMS Error:', error.message);
      return false;
    }
  }

  // Send booking confirmation
  async sendBookingConfirmation(phone, date, time) {
    console.log('📅 Sending Booking Confirmation via MSG91');
    
    const variables = {
      date: date,
      time: time,
      clinic_phone: process.env.ADMIN_PHONE || '+919524350214'
    };
    
    return await this.sendTemplateSMS(phone, this.bookingTemplateId, variables);
  }

  // Send cancellation notice
  async sendCancellationNotice(phone) {
    console.log('❌ Sending Cancellation Notice via MSG91');
    
    const variables = {
      clinic_phone: process.env.ADMIN_PHONE || '+919524350214'
    };
    
    return await this.sendTemplateSMS(phone, this.cancellationTemplateId, variables);
  }

  // Verify OTP (if using MSG91's OTP verification)
  async verifyOTP(phone, otp) {
    try {
      const mobileNumber = phone.replace('+91', '');
      
      const url = `${this.baseURL}/otp/verify`;
      const params = {
        authkey: this.authKey,
        mobile: '91' + mobileNumber,
        otp: otp
      };

      const response = await axios.get(url, { params });
      
      return response.data.type === 'success';
      
    } catch (error) {
      console.error('❌ MSG91 OTP Verification Error:', error.message);
      return false;
    }
  }

  // Resend OTP
  async resendOTP(phone) {
    try {
      const mobileNumber = phone.replace('+91', '');
      
      const url = `${this.baseURL}/otp/retry`;
      const data = {
        authkey: this.authKey,
        mobile: '91' + mobileNumber,
        retrytype: 'text' // Can be 'text' or 'voice'
      };

      const response = await axios.post(url, data);
      
      return response.data.type === 'success';
      
    } catch (error) {
      console.error('❌ MSG91 Resend OTP Error:', error.message);
      return false;
    }
  }
}

module.exports = new MSG91Service();