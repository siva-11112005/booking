const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Validate env configuration
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD;

    if (!emailUser || !emailPass) {
      console.warn('⚠️  EMAIL_USER / EMAIL_APP_PASSWORD not set. Configure Gmail App Password for reliable email OTP.');
    }

    // Create transporter with Gmail (App Password recommended)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // Verify transporter
    this.transporter.verify((error) => {
      if (error) {
        console.error('❌ Email service not ready:', error.message);
      } else {
        console.log('✅ Email service ready');
      }
    });
  }

  // Email templates
  getOTPTemplate(name, otp) {
    return {
      subject: 'Your OTP for Eswari Physiotherapy',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px solid #e67e22; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
            .otp-code { font-size: 32px; font-weight: bold; color: #e67e22; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eswari Physiotherapy</h1>
              <p>OTP Verification</p>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Your One-Time Password (OTP) for registration/login is:</p>
              <div class="otp-box">
                <div class="otp-code">${otp}</div>
              </div>
              <p><strong>This OTP is valid for 5 minutes only.</strong></p>
              <p>Please do not share this OTP with anyone for security reasons.</p>
              <p>If you didn't request this OTP, please ignore this email.</p>
              <br>
              <p>Best regards,<br>
              <strong>Eswari</strong><br>
              Bachelor of Physiotherapy (BPT)<br>
              📞 +919524350214</p>
            </div>
            <div class="footer">
              <p>© 2024 Eswari Physiotherapy Clinic. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getBookingConfirmationTemplate(name, date, time, painType) {
    return {
      subject: `Appointment Confirmed - ${date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745 0%, #218838 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .appointment-box { background: white; border: 2px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 10px; }
            .detail { margin: 10px 0; padding: 10px; background: #e8f5e9; border-left: 4px solid #28a745; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .important { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Appointment Confirmed!</h1>
              <p>Eswari Physiotherapy</p>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              <p>Your appointment has been successfully booked. Here are the details:</p>
              
              <div class="appointment-box">
                <div class="detail"><strong>📅 Date:</strong> ${date}</div>
                <div class="detail"><strong>⏰ Time:</strong> ${time}</div>
                <div class="detail"><strong>💊 Condition:</strong> ${painType || 'General Consultation'}</div>
                <div class="detail"><strong>⏱️ Duration:</strong> 50 minutes</div>
              </div>

              <div class="important">
                <strong>Important Instructions:</strong>
                <ul>
                  <li>Please arrive 10 minutes before your appointment</li>
                  <li>Wear comfortable clothing</li>
                  <li>Bring any previous medical reports if available</li>
                  <li>Session duration is 50 minutes</li>
                </ul>
              </div>

              <p><strong>Clinic Address:</strong><br>
              [Your Clinic Address Here]</p>
              
              <p><strong>Contact:</strong><br>
              📞 ${process.env.ADMIN_PHONE || '+917418042205'}<br>
              ✉️ ${process.env.ADMIN_EMAIL || 'eswaripalani2002@gmail.com'}</p>

              <p>If you need to cancel or reschedule, please contact us at least 2 hours in advance.</p>
              
              <br>
              <p>Looking forward to seeing you!</p>
              <p>Best regards,<br>
              <strong>Eswari</strong><br>
              Bachelor of Physiotherapy (BPT)</p>
            </div>
            <div class="footer">
              <p>© 2024 Eswari Physiotherapy Clinic. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getCancellationTemplate(name, date, time) {
    return {
      subject: 'Appointment Cancelled',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .cancel-box { background: #ffebee; border: 2px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Appointment Cancelled</h1>
              <p>Eswari Physiotherapy</p>
            </div>
            <div class="content">
              <p>Dear ${name},</p>
              
              <div class="cancel-box">
                <p>Your appointment scheduled for:</p>
                <p><strong>📅 Date:</strong> ${date}<br>
                <strong>⏰ Time:</strong> ${time}</p>
                <p>has been <strong>CANCELLED</strong>.</p>
              </div>

              <p>If you wish to book another appointment, please visit our website or contact us directly.</p>
              
              <p><strong>Contact:</strong><br>
              📞 ${process.env.ADMIN_PHONE || '+917418042205'}<br>
              ✉️ ${process.env.ADMIN_EMAIL || 'eswaripalani2002@gmail.com'}</p>
              
              <br>
              <p>We apologize for any inconvenience caused.</p>
              
              <p>Best regards,<br>
              <strong>Eswari Physiotherapy Clinic</strong></p>
            </div>
            <div class="footer">
              <p>© 2024 Eswari Physiotherapy Clinic. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  // Send email
  async sendEmail(to, template) {
    try {
      const mailOptions = {
        from: `"Eswari Physiotherapy" <${process.env.EMAIL_USER || process.env.ADMIN_EMAIL || 'eswaripalani2002@gmail.com'}>`,
        to: to,
        ...template
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Email Error:', error.message);
      return false;
    }
  }

  // Public methods
  async sendOTPEmail(email, name, otp) {
    const template = this.getOTPTemplate(name, otp);
    return await this.sendEmail(email, template);
  }

  async sendBookingConfirmationEmail(email, name, date, time, painType) {
    const template = this.getBookingConfirmationTemplate(name, date, time, painType);
    return await this.sendEmail(email, template);
  }

  async sendCancellationEmail(email, name, date, time) {
    const template = this.getCancellationTemplate(name, date, time);
    return await this.sendEmail(email, template);
  }

  // Send generic email (for account updates, alerts, etc.)
  async sendGenericEmail(email, subject, content) {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; white-space: pre-wrap; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Eswari Physiotherapy</h1>
            </div>
            <div class="content">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>© 2024 Eswari Physiotherapy Clinic. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const template = {
        subject: subject,
        html: htmlContent
      };

      return await this.sendEmail(email, template);
    } catch (error) {
      console.error('❌ Generic Email Error:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();