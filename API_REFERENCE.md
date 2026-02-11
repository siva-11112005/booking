# OTP & Notification API Reference

## 📱 Registration / Account Creation

### 1. Send OTP (SMS or Email)
**Endpoint:** `POST /api/auth/send-otp`

**Default: SMS OTP**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "email": "user@example.com",
    "sendVia": "sms"
  }'
```

**Alternative: Email OTP**
```bash
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "email": "user@example.com",
    "sendVia": "email"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "✅ OTP sent successfully to your mobile number",
  "method": "sms",
  "identifier": "+919876543210",
  "alternativeMethod": "email",
  "expiryTime": 5
}
```

**Parameters:**
- `phone` (string, optional) - Indian phone number
- `email` (string, optional) - Email address
- `sendVia` (string, optional) - "sms" (default) or "email"

**Status Codes:**
- `200` - OTP sent successfully
- `400` - Invalid input or already registered
- `429` - Rate limit exceeded
- `500` - Server error

---

## 🔐 Password Reset

### 1. Request Password Reset OTP
**Endpoint:** `POST /api/auth/forgot-password`

**Send via Email:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "sendVia": "email"
  }'
```

**Send via SMS:**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "sendVia": "sms"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "✅ OTP sent to your registered email. You can also use SMS if preferred.",
  "method": "email",
  "identifier": "user@example.com",
  "alternativeMethod": "sms",
  "expiryTime": 5
}
```

**Parameters:**
- `phone` (string, optional) - Indian phone number
- `email` (string, optional) - Email address
- `sendVia` (string) - "email" or "sms"

### 2. Reset Password with OTP
**Endpoint:** `POST /api/auth/reset-password`

```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456",
    "newPassword": "newSecurePassword123"
  }'
```

---

## 📧 Account Update Notifications

### Triggered Automatically On:
- Profile update
- Password change
- Email change
- Phone number change

**Example - After Profile Update:**
```javascript
// Backend automatically sends
await notificationService.sendAccountUpdateEmail(
  user.email,
  user.name,
  'profile_updated',
  { fields: ['Name', 'Phone Number'] }
);
```

---

## 🚨 Appointment Cancellation Notifications

### Automatic on Appointment Cancel
**Endpoint:** `DELETE /api/appointments/:id`

**Automatic Notification:**
- SMS sent via SMS Gateway (Primary)
- Email sent as backup

---

## 📊 OTP Rate Limits

| Method | Limit | Duration | Use Case |
|--------|-------|----------|----------|
| SMS | 5 OTPs | Per day | Registration, Password Reset |
| Email | 10 OTPs | Per day | Registration, Password Reset |
| Cooldown | 1 min | Between requests | Prevents spam |

---

## ✉️ Email Types

### 1. Account Update Email
**Types:**
- `profile_updated` - Profile changes
- `password_changed` - Password reset
- `email_updated` - Email change
- `phone_updated` - Phone change

### 2. Login Alert Email
**Includes:**
- Timestamp
- Device info
- Password reset link
- Admin contact

### 3. OTP Email
**Includes:**
- 6-digit OTP
- Validity time
- Security warning
- Do not share notice

### 4. Booking Confirmation
**Includes:**
- Appointment date & time
- Clinic address
- Contact number
- Cancellation link

### 5. Cancellation Notice
**Includes:**
- Cancellation confirmation
- Clinic contact
- Rebooking option

---

## 🔄 Flow Diagrams

### Registration Flow (SMS Default)
```
User visits Register
  ↓
Choose: SMS (default) or Email
  ↓
Enter phone/email
  ↓
/send-otp (sendVia: 'sms' or 'email')
  ↓
OTP sent via SMS Gateway or Email
  ↓
User sees message with alternative method
  ↓
Enter OTP
  ↓
Verify OTP
  ↓
Create account
```

### Password Reset Flow (User Choice)
```
User visits Forgot Password
  ↓
Enter email or phone
  ↓
Choose: Email or SMS
  ↓
/forgot-password (sendVia: chosen method)
  ↓
OTP sent via chosen method
  ↓
User can switch if OTP not received
  ↓
Enter OTP
  ↓
/reset-password
  ↓
New password set
```

### Appointment Cancellation Flow
```
User cancels appointment
  ↓
DELETE /api/appointments/:id
  ↓
SMS sent via SMS Gateway (Primary)
  ↓
Email sent (Backup)
  ↓
User receives cancellation confirmation
```

---

## 🛠️ Common Issues & Solutions

### Issue: "Maximum OTP limit reached"
**Solution:** 
- SMS limit: 5 per day
- Email limit: 10 per day
- Try again tomorrow
- Use different method (SMS ↔ Email) - different limits

### Issue: "Please wait 1 minute before requesting"
**Solution:**
- Prevent spam - wait 1 minute between requests
- OTP already sent, check SMS/Email

### Issue: "Phone number already registered"
**Solution:**
- Use different phone number
- Or use "forgot-password" if you forgot credentials

### Issue: "Email not available for this account"
**Solution:**
- Email not registered for this account
- Use SMS method instead
- Or login and update email first

---

## 💡 Frontend Integration Tips

### Show User Options
```javascript
const methods = response.data.alternativeMethod ? 
  ['SMS', 'Email'] : [response.data.method];

console.log(`OTP sent via: ${response.data.method}`);
console.log(`Alternative method available: ${response.data.alternativeMethod}`);
```

### Display Expiry Timer
```javascript
const expiryMinutes = response.data.expiryTime;
// Show countdown timer: 5:00, 4:59, 4:58...
```

### Handle Rate Limiting
```javascript
if (error.response.status === 429) {
  console.log('Rate limited:', error.response.data.message);
  // Show: "Too many OTP attempts. Please try again later."
}
```

---

## 📝 Notes

- All OTPs valid for 5 minutes
- SMS is FREE via SMS Gateway service
- Email OTP higher limit (10 vs 5) due to email availability
- All notifications logged in console for development
- Production: Only console logs (OTP not visible)
