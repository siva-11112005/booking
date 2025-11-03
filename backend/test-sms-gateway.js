require('dotenv').config();
const smsGatewayService = require('./utils/smsGatewayService');
const notificationService = require('./utils/notificationService');

async function testSMSGateway() {
  console.log('\n════════════════════════════════════════');
  console.log('🧪 TESTING SMS GATEWAY (FREE SERVICE)');
  console.log('════════════════════════════════════════\n');
  
  const testPhone = '+916382016126';
  const testEmail = 'sivasakthivelpalanisamy11@gmail.com';
  const testName = 'Test User';
  const testOTP = '123456';
  
  console.log('📋 Configuration:');
  console.log('─────────────────────────');
  console.log('SMS Gateway Username:', process.env.SMS_GATEWAY_USERNAME || '❌ Not set');
  console.log('SMS Gateway Password:', process.env.SMS_GATEWAY_PASSWORD ? '✅ Set' : '❌ Not set');
  console.log('Test Phone:', testPhone);
  console.log('Test Email:', testEmail);
  console.log('─────────────────────────\n');
  
  if (!process.env.SMS_GATEWAY_USERNAME || !process.env.SMS_GATEWAY_PASSWORD) {
    console.error('❌ ERROR: SMS Gateway credentials not configured!');
    console.log('\n📝 Steps to fix:');
    console.log('1. Sign up at: https://sms-gate.app');
    console.log('2. Get your username and password');
    console.log('3. Add to .env file:');
    console.log('   SMS_GATEWAY_USERNAME=your_username');
    console.log('   SMS_GATEWAY_PASSWORD=your_password\n');
    return;
  }
  
  try {
    // Test 1: Send OTP via SMS
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 1: Send OTP via SMS Gateway');
    console.log('═══════════════════════════════════════\n');
    
    const smsResult = await smsGatewayService.sendOTP(testPhone, testOTP);
    
    if (smsResult.success) {
      console.log('✅ SMS sent successfully!');
    } else {
      console.log('⚠️  SMS failed, but that\'s okay - email fallback available');
    }
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 2: Send OTP with Email Fallback
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 2: Send OTP with Email Fallback');
    console.log('═══════════════════════════════════════\n');
    
    await notificationService.sendOTP(testPhone, testEmail, testName, testOTP, false);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 3: Send OTP via Email Only
    console.log('\n═══════════════════════════════════════');
    console.log('TEST 3: Send OTP via Email Only');
    console.log('═══════════════════════════════════════\n');
    
    await notificationService.sendOTP('', testEmail, testName, '654321', true);
    
    console.log('\n════════════════════════════════════════');
    console.log('✅ ALL TESTS COMPLETED!');
    console.log('════════════════════════════════════════\n');
    
    console.log('📊 Results:');
    console.log('1. Check phone for SMS (if SMS Gateway is working)');
    console.log('2. Check email for OTP messages');
    console.log('3. Console always shows OTP for development\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run test
testSMSGateway();