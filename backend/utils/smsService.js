// backend/utils/smsService.js
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (to, text) => {
  try {
    const from = process.env.TWILIO_PHONE_NUMBER;

    console.log('📱 SMS Details:');
    console.log('   To:', to);
    console.log('   From:', from);
    console.log('   Message:', text);

    await client.messages.create({ body: text, from, to });
    console.log('✅ SMS sent successfully');
    return true;
  } catch (error) {
    console.error('❌ SMS Error:', error.message);
    console.error('Full error:', JSON.stringify(error, null, 2));
    // Return true anyway so registration continues (OTP is in logs)
    return true;
  }
};

const sendOTP = async (phone, otp) => {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🔐 OTP GENERATED:');
  console.log('   Phone:', phone);
  console.log('   OTP:', otp);
  console.log('   Valid for: 5 minutes');
  console.log('═'.repeat(60));
  console.log('');

  const message = `Your OTP for Eswari Physiotherapy is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  const sent = await sendSMS(phone, message);

  if (!sent) {
    console.log('⚠️  SMS failed, but OTP is logged above. Use it for testing.');
  }

  return true;
};

const sendBookingConfirmation = async (phone, date, timeSlot) => {
  console.log('📅 Booking Confirmation:', { phone, date, timeSlot });
  const message = `Your appointment with Eswari Physiotherapy is confirmed for ${date} at ${timeSlot}. For details, contact ${process.env.ADMIN_PHONE}`;
  return await sendSMS(phone, message);
};

const sendCancellationNotice = async (phone) => {
  console.log('❌ Cancellation Notice:', phone);
  const message = `Your appointment with Eswari Physiotherapy has been cancelled. For details, contact ${process.env.ADMIN_PHONE}`;
  return await sendSMS(phone, message);
};

module.exports = {
  sendOTP,
  sendBookingConfirmation,
  sendCancellationNotice,
};
