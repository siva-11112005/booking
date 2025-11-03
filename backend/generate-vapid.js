 
const webpush = require('web-push');

console.log('\n=======================================');
console.log('🔑 GENERATING VAPID KEYS...');
console.log('=======================================\n');

try {
  // Generate VAPID keys
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('✅ VAPID KEYS GENERATED SUCCESSFULLY!\n');
  console.log('=======================================');
  console.log('📋 COPY THESE KEYS:');
  console.log('=======================================\n');

  console.log('Public Key:');
  console.log(vapidKeys.publicKey);
  console.log('\nPrivate Key:');
  console.log(vapidKeys.privateKey);

  console.log('\n=======================================');
  console.log('📝 BACKEND .env FILE:');
  console.log('=======================================\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:eswaripalani2002@gmail.com`);

  console.log('\n=======================================');
  console.log('📝 FRONTEND .env FILE:');
  console.log('=======================================\n');
  console.log(`REACT_APP_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);

  console.log('\n=======================================');
  console.log('☁️ RENDER ENVIRONMENT VARIABLES:');
  console.log('=======================================\n');
  console.log('Add these in Render Dashboard → Environment:\n');
  console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:eswaripalani2002@gmail.com`);

  console.log('\n=======================================');
  console.log('✅ DONE! Copy the keys above to your .env files');
  console.log('=======================================\n');

} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('\n⚠️  Make sure web-push is installed:');
  console.error('   npm install web-push --save\n');
}