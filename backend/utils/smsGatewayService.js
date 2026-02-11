const axios = require('axios');
const https = require('https');
const twilio = require('twilio');

class SMSGatewayService {
  constructor() {
    this.username = process.env.SMS_GATEWAY_USERNAME;
    this.password = process.env.SMS_GATEWAY_PASSWORD;
    this.baseURL = 'https://api.sms-gate.app/3rdparty/v1';
    // Twilio fallback config
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioFrom = process.env.TWILIO_FROM;
    
    // Create axios instance that ignores SSL in development
    this.axiosInstance = axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }),
      timeout: 15000
    });
    
    console.log('📱 SMS Gateway Service Initialized');
    console.log('   Username:', this.username ? '✅ Set' : '❌ Missing');
    console.log('   Free SMS service - No cost!');
    console.log('   Twilio Fallback:', (this.twilioSid && this.twilioToken && this.twilioFrom) ? '✅ Available' : '❌ Not configured');

    if (!this.username || !this.password) {
      console.warn('⚠️  SMS Gateway credentials missing! Will try Twilio if configured, else email fallback.');
    }
  }

  async sendSMS(phone, message) {
    try {
      let formattedPhone = phone;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = phone.startsWith('91') ? '+' + phone : phone;
      }
      
      console.log('📤 Sending SMS via SMS Gateway:');
      console.log('   To:', formattedPhone);
      console.log('   Message:', message.substring(0, 50) + '...');
      
      const authString = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      
      const response = await this.axiosInstance.post(
        `${this.baseURL}/messages`,
        {
          textMessage: { text: message },
          phoneNumbers: [formattedPhone]
        },
        {
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📡 SMS Gateway Response:', response.data);
      
      if (response.data && (response.data.success || response.status === 200)) {
        console.log('✅ SMS sent successfully via SMS Gateway!');
        return { success: true, provider: 'sms-gateway' };
      }
      
      console.log('⚠️  SMS Gateway returned:', response.data);
      // Try Twilio fallback
      if (this.twilioSid && this.twilioToken && this.twilioFrom) {
        return await this.sendViaTwilio(formattedPhone, message);
      }
      return { success: false, error: 'SMS Gateway failed', provider: 'sms-gateway' };
      
    } catch (error) {
      console.error('❌ SMS Gateway Error:', error.message);
      
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      
      // Try Twilio fallback when SMS Gateway errors out
      if (this.twilioSid && this.twilioToken && this.twilioFrom) {
        let formattedPhone = phone;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = phone.startsWith('91') ? '+' + phone : phone;
        }
        return await this.sendViaTwilio(formattedPhone, message);
      }

      return {
        success: false,
        error: error.message,
        provider: 'sms-gateway',
        fallbackToEmail: true
      };
    }
  }

  async sendViaTwilio(to, message) {
    try {
      console.log('📤 Sending SMS via Twilio fallback:');
      console.log('   From:', this.twilioFrom);
      console.log('   To:', to);
      const client = twilio(this.twilioSid, this.twilioToken);
      const resp = await client.messages.create({
        body: message,
        from: this.twilioFrom,
        to
      });
      console.log('📡 Twilio Response:', { sid: resp.sid, status: resp.status });
      return { success: true, provider: 'twilio', sid: resp.sid };
    } catch (err) {
      console.error('❌ Twilio Error:', err.message);
      return { success: false, error: err.message, provider: 'twilio' };
    }
  }

  async sendOTP(phone, otp) {
    const message = `Your OTP for Eswari Physiotherapy is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    return await this.sendSMS(phone, message);
  }

  async sendBookingConfirmation(phone, date, time) {
    const message = `Appointment confirmed at Eswari Physiotherapy on ${date} at ${time}. Contact: ${process.env.ADMIN_PHONE}`;
    return await this.sendSMS(phone, message);
  }

  async sendCancellationNotice(phone) {
    const message = `Your appointment at Eswari Physiotherapy has been cancelled. Contact: ${process.env.ADMIN_PHONE}`;
    return await this.sendSMS(phone, message);
  }
}

module.exports = new SMSGatewayService();