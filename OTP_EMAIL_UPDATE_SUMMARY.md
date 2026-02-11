# OTP & Email Notification Update Summary

## Overview
Updated the entire OTP and notification system to support SMS-only for registration and appointment cancellation, while adding email options for password reset and account updates.

---

## Configuration Changes

### .env File Updates
```
MAX_EMAIL_OTP_PER_DAY=10
```
- Added new environment variable for email-specific OTP limit
- SMS OTP limit: **5 per day** (MAX_OTP_PER_DAY)
- Email OTP limit: **10 per day** (MAX_EMAIL_OTP_PER_DAY)

---

## Backend Changes

### 1. **auth.js** - Route Updates

#### A. `checkOTPLimit()` Function - Enhanced
```javascript
const checkOTPLimit = async (identifier, isEmail = false)
```
- Now supports different limits for email vs SMS
- Email limit: 10 OTPs/day
- SMS limit: 5 OTPs/day
- Automatically detects if identifier is email address

#### B. `/send-otp` Endpoint - Registration OTP
**Request Format:**
```json
{
  "phone": "+919876543210",
  "email": "user@example.com",
  "sendVia": "sms"  // or "email"
}
```

**Features:**
- Default: SMS OTP for registration
- Option: Send via email instead
- Response includes `alternativeMethod` to show users they can switch
- Respects daily limits (5 for SMS, 10 for email)

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

#### C. `/forgot-password` Endpoint - Password Reset
**Request Format:**
```json
{
  "phone": "+919876543210",
  "email": "user@example.com",
  "sendVia": "email"  // or "sms"
}
```

**Features:**
- Users can choose: `"sendVia": "email"` or `"sendVia": "sms"`
- Email OTP limit: 10/day
- SMS OTP limit: 5/day
- Shows alternative method available
- Validates user has requested contact method

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

---

### 2. **notificationService.js** - New Methods

#### A. `sendAccountUpdateEmail()` - Account Changes
```javascript
await notificationService.sendAccountUpdateEmail(
  email, 
  name, 
  'profile_updated',  // or 'password_changed', 'email_updated', 'phone_updated'
  { fields: ['Name', 'Phone'] }
)
```

**Supported Update Types:**
- `profile_updated` - General profile changes
- `password_changed` - Password reset notification
- `email_updated` - Email change notification
- `phone_updated` - Phone number change notification

**Features:**
- Sends detailed email about what was updated
- Includes admin contact number
- Security warning if not expected

#### B. `sendLoginAlertEmail()` - Login Notifications
```javascript
await notificationService.sendLoginAlertEmail(
  email,
  name,
  {
    timestamp: '19/12/2024 3:30 PM',
    device: 'Chrome on Windows'
  }
)
```

**Features:**
- Notifies user of new login
- Includes timestamp and device info
- Provides quick link to password reset
- Security warning included

---

### 3. **emailService.js** - New Method

#### `sendGenericEmail()` - Generic Email Sender
```javascript
await emailService.sendGenericEmail(
  'user@example.com',
  'Your Subject Here',
  'Your message content here\nWith multiple lines if needed'
)
```

**Features:**
- Generic email template with Eswari branding
- HTML formatted automatically
- Used by account update and login alerts
- Returns true/false for success status

---

## Notification Flow

### Registration / Account Creation
```
User chooses: SMS (default) or Email
  ↓
/send-otp endpoint
  ↓
Rate limit check (SMS: 5/day, Email: 10/day)
  ↓
OTP sent via SMS Gateway or Email Service
  ↓
User enters OTP to register
```

### Password Reset (Forgot Password)
```
User chooses: Email or SMS
  ↓
/forgot-password endpoint
  ↓
Rate limit check (Email: 10/day, SMS: 5/day)
  ↓
OTP sent via chosen method
  ↓
User can switch methods if needed
  ↓
/reset-password to confirm
```

### Account Updates
```
User updates profile/email/phone/password
  ↓
sendAccountUpdateEmail() sends notification
  ↓
Email sent with details of update
  ↓
Include admin contact for security concerns
```

### Appointment Cancellation
```
User cancels appointment
  ↓
sendCancellationNotice() via SMS Gateway
  ↓
SMS sent as PRIMARY method
  ↓
Email also sent as secondary notification
```

---

## Usage Examples

### Frontend - Registration with Email Option

**Option 1: SMS OTP (Default)**
```javascript
const response = await fetch('/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+919876543210',
    email: 'user@example.com',
    sendVia: 'sms'  // Default: SMS
  })
});
```

**Option 2: Email OTP**
```javascript
const response = await fetch('/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+919876543210',
    email: 'user@example.com',
    sendVia: 'email'
  })
});
```

### Frontend - Password Reset with Choice

**Email Method:**
```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    sendVia: 'email'  // Send OTP to email
  })
});
```

**SMS Method:**
```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '+919876543210',
    sendVia: 'sms'  // Send OTP to SMS
  })
});
```

---

## Rate Limiting Summary

| Method | Daily Limit | Use Case |
|--------|------------|----------|
| SMS OTP | 5 per day | Registration, Password Reset |
| Email OTP | 10 per day | Registration, Password Reset |

---

## Security Features

✅ OTP rate limiting (prevent brute force)
✅ 1-minute cooldown between OTP requests
✅ 5-minute OTP validity
✅ Method-specific limits (email vs SMS)
✅ Account update notifications
✅ Login alert emails
✅ User can choose preferred method
✅ Email includes admin contact for security issues

---

## Testing Checklist

- [ ] Register via SMS OTP
- [ ] Register via Email OTP
- [ ] Switch from SMS to Email during registration
- [ ] Forgot password via Email
- [ ] Forgot password via SMS
- [ ] Account update notifications received
- [ ] Login alert emails received
- [ ] Rate limiting works (5 SMS, 10 Email)
- [ ] 1-minute cooldown enforced
- [ ] Console logs show all OTP details in development

---

## Notes

1. **SMS for Registration Default**: SMS remains primary for account creation (faster, cost-free)
2. **Email for Password Reset**: Email now offers choice option
3. **Email for Updates**: All account changes notify via email
4. **Appointment Cancellation**: SMS remains primary, email as backup
5. **Daily Limits**: Email gets higher limit (10) vs SMS (5) due to free SMS service constraints

---

## Files Modified

1. ✅ `.env` - Added MAX_EMAIL_OTP_PER_DAY
2. ✅ `backend/routes/auth.js` - Updated OTP endpoints
3. ✅ `backend/utils/notificationService.js` - Added email notifications
4. ✅ `backend/utils/emailService.js` - Added generic email method

## No Errors Found ✅
All changes have been validated with no syntax or configuration errors.
