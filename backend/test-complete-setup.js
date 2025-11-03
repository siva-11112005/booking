require('dotenv').config();

console.log('\n════════════════════════════════════════');
console.log('🧪 COMPLETE SETUP TEST');
console.log('════════════════════════════════════════\n');

// Check Environment Variables
console.log('📋 Environment Check:');
console.log('───────────────────────────────');

const checks = {
  'MongoDB': process.env.MONGODB_URI ? '✅' : '❌',
  'JWT Secret': process.env.JWT_SECRET ? '✅' : '❌',
  'SMS Gateway User': process.env.SMS_GATEWAY_USERNAME ? '✅' : '❌',
  'SMS Gateway Pass': process.env.SMS_GATEWAY_PASSWORD ? '✅' : '❌',
  'Email User': process.env.EMAIL_USER ? '✅' : '❌',
  'Email Password': process.env.EMAIL_APP_PASSWORD ? '✅' : '❌',
  'Razorpay Key ID': process.env.RAZORPAY_KEY_ID ? '✅' : '❌',
  'Razorpay Secret': process.env.RAZORPAY_KEY_SECRET ? '✅' : '❌',
  'Admin Phone': process.env.ADMIN_PHONE ? '✅' : '❌',
  'Dev Mode': process.env.DEVELOPMENT_MODE === 'true' ? '✅ (₹1)' : '❌'
};

Object.entries(checks).forEach(([key, status]) => {
  console.log(`${key}: ${status}`);
});

console.log('\n📊 Next Steps:');
console.log('───────────────────────────────');
console.log('1. Get Razorpay keys from dashboard.razorpay.com');
console.log('2. Update RAZORPAY_KEY_ID in backend/.env');
console.log('3. Update REACT_APP_RAZORPAY_KEY in frontend/.env');
console.log('4. Test SMS: node test-sms-gateway.js');
console.log('5. Start backend: npm start');
console.log('6. Start frontend: npm start');
console.log('7. Test registration with email OTP option');
console.log('8. Book appointment for ₹1 (dev mode)');

console.log('\n🎯 All prices set to ₹1 for development!');
console.log('════════════════════════════════════════\n');