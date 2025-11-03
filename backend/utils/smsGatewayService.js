const axios = require('axios');
const https = require('https');

class SMSGatewayService {
  constructor() {
    this.username = process.env.SMS_GATEWAY_USERNAME;
    this.password = process.env.SMS_GATEWAY_PASSWORD;
    this.baseURL = 'https://api.sms-gate.app/3rdparty/v1';
    
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
    
    if (!this.username || !this.password) {
      console.warn('⚠️  SMS Gateway credentials missing! Email fallback will be used.');
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
      return { success: false, error: 'SMS Gateway failed', provider: 'sms-gateway' };
      
    } catch (error) {
      console.error('❌ SMS Gateway Error:', error.message);
      
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Data:', error.response.data);
      }
      
      return { 
        success: false, 
        error: error.message, 
        provider: 'sms-gateway',
        fallbackToEmail: true 
      };
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