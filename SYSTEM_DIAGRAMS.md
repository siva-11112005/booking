# System Flow & Architecture Diagrams

## 📊 OTP System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  ESWARI PHYSIOTHERAPY APP                   │
│                    OTP & EMAIL SYSTEM                       │
└─────────────────────────────────────────────────────────────┘

┌─ REGISTRATION/LOGIN FLOW ──────────────────────────────────┐
│                                                              │
│  User Registration                                          │
│       ↓                                                      │
│  Choose: SMS (default) or Email                            │
│       ↓                                                      │
│  /send-otp {sendVia: 'sms'|'email'}                        │
│       ↓                                                      │
│  Rate Check: SMS(5/day), Email(10/day)                     │
│       ↓                                                      │
│  ┌────────────────────────────────────┐                    │
│  │   sendVia: 'sms'                   │                    │
│  │   ↓ (SMS Gateway - FREE)           │                    │
│  │   +91-XXXX-XXXXX                   │                    │
│  │   "OTP: 123456"                    │                    │
│  └────────────────────────────────────┘                    │
│  OR                                                         │
│  ┌────────────────────────────────────┐                    │
│  │   sendVia: 'email'                 │                    │
│  │   ↓ (Email Service)                │                    │
│  │   user@example.com                 │                    │
│  │   "Your OTP: 123456"               │                    │
│  └────────────────────────────────────┘                    │
│       ↓                                                      │
│  User Enters OTP                                            │
│       ↓                                                      │
│  /verify-otp                                                │
│       ↓                                                      │
│  Account Created ✅                                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─ PASSWORD RESET FLOW ──────────────────────────────────────┐
│                                                              │
│  User: Forgot Password                                      │
│       ↓                                                      │
│  Enter Email or Phone                                       │
│       ↓                                                      │
│  Choose Method: Email or SMS                                │
│       ↓                                                      │
│  /forgot-password {sendVia: 'email'|'sms'}                │
│       ↓                                                      │
│  Rate Check: SMS(5/day), Email(10/day)                     │
│       ↓                                                      │
│  ┌────────────────────────────────────┐                    │
│  │   sendVia: 'email'                 │                    │
│  │   ↓                                 │                    │
│  │   "Password Reset OTP: 654321"     │                    │
│  │   Includes: Password Reset Link    │                    │
│  └────────────────────────────────────┘                    │
│  OR                                                         │
│  ┌────────────────────────────────────┐                    │
│  │   sendVia: 'sms'                   │                    │
│  │   ↓                                 │                    │
│  │   "Reset OTP: 654321"              │                    │
│  │   Contact: +91-XXXX-XXXXX          │                    │
│  └────────────────────────────────────┘                    │
│       ↓                                                      │
│  User Enters OTP                                            │
│       ↓                                                      │
│  /reset-password {otp, newPassword}                         │
│       ↓                                                      │
│  ✅ Email: "Password Changed Alert"                         │
│  ✅ Password Reset Successful                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─ ACCOUNT UPDATE NOTIFICATIONS ─────────────────────────────┐
│                                                              │
│  User Updates Profile                                       │
│       ↓                                                      │
│  Changes: Name, Phone, Email                                │
│       ↓                                                      │
│  Automatic Email Sent:                                      │
│  "Your profile has been updated"                            │
│  Fields changed: [Name, Phone]                              │
│  Contact admin if not expected                              │
│       ↓                                                      │
│  User Changes Password                                      │
│       ↓                                                      │
│  Automatic Email: "Password Changed Alert"                  │
│  Contact admin if suspicious                                │
│       ↓                                                      │
│  User Changes Email                                         │
│       ↓                                                      │
│  Email to old address: "Email changed to: new@email.com"    │
│  Email to new address: "Your email updated"                 │
│       ↓                                                      │
│  User Changes Phone                                         │
│       ↓                                                      │
│  Automatic Email: "Phone number updated"                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─ APPOINTMENT CANCELLATION ─────────────────────────────────┐
│                                                              │
│  User Cancels Appointment                                   │
│       ↓                                                      │
│  DELETE /appointments/:id                                   │
│       ↓                                                      │
│  ┌────────────────────────────────────┐                    │
│  │ PRIMARY: SMS Gateway               │                    │
│  │ "Your appointment cancelled"       │                    │
│  │ Contact: +91-XXXX-XXXXX            │                    │
│  └────────────────────────────────────┘                    │
│       ↓                                                      │
│  ┌────────────────────────────────────┐                    │
│  │ BACKUP: Email                      │                    │
│  │ "Appointment Cancellation Notice"  │                    │
│  │ Appointment: [Date & Time]         │                    │
│  └────────────────────────────────────┘                    │
│       ↓                                                      │
│  ✅ Cancellation Confirmed                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─ LOGIN ALERT NOTIFICATIONS ────────────────────────────────┐
│                                                              │
│  User Logs In                                               │
│       ↓                                                      │
│  Automatic Email Sent:                                      │
│  "New Login Alert"                                          │
│  Time: 19/12/2024 3:30 PM                                   │
│  Device: Chrome on Windows                                  │
│  Action: Change password if not expected                    │
│       ↓                                                      │
│  Email includes reset link                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Rate Limiting System

```
┌─────────────────────────────────────────────────────────────┐
│              OTP RATE LIMITING (Per Day)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SMS OTP:  [█ █ █ █ █ |_]  5 requests max                   │
│            Day resets: 12:00 AM                             │
│                                                              │
│  Email OTP: [█ █ █ █ █ █ █ █ █ █ |_] 10 requests max       │
│             Day resets: 12:00 AM                            │
│                                                              │
│  Cooldown: 1 minute between requests                        │
│            Prevents spam/brute force                        │
│                                                              │
│  OTP Validity: 5 minutes                                    │
│                After which OTP expires                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Notification Routing

```
┌────────────────────────────────────────────────────────────┐
│            NOTIFICATION ROUTING SYSTEM                      │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  sendOTP()                                                  │
│  ├─ SMS Primary (Free via SMS Gateway)                     │
│  │  └─ Success? Return 'sms'                               │
│  │                                                         │
│  └─ SMS Failed? Try Email (Fallback)                       │
│     └─ Success? Return 'email'                             │
│                                                             │
│  sendCancellationNotice()                                   │
│  ├─ SMS (Primary) via SMS Gateway                          │
│  │  └─ Success = notified via SMS                          │
│  │                                                         │
│  └─ Email (Secondary) Always sent                          │
│     └─ Success = backup notification                       │
│                                                             │
│  sendAccountUpdateEmail()                                   │
│  └─ Email Only (No fallback needed)                        │
│     └─ User address always on file                         │
│                                                             │
│  sendLoginAlertEmail()                                      │
│  └─ Email Only (Security alert)                            │
│     └─ User notified immediately                           │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
├─────────────────────────────────────────────────────────────┤
│  Register    Login    Forgot Password    Profile Update     │
│      ↓         ↓            ↓                ↓               │
├─────────────────────────────────────────────────────────────┤
│                   API LAYER (Express Routes)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  POST /send-otp                 (Registration OTP)          │
│       ↓                                                      │
│  POST /verify-otp               (Verify OTP)                │
│       ↓                                                      │
│  POST /forgot-password          (Password Reset)            │
│       ↓                                                      │
│  POST /reset-password           (Confirm Reset)            │
│       ↓                                                      │
│  DELETE /appointments/:id       (Cancel Appointment)        │
│       ↓                                                      │
├─────────────────────────────────────────────────────────────┤
│              NOTIFICATION SERVICE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  NotificationService                                        │
│  ├─ sendOTP()                                              │
│  ├─ sendBookingConfirmation()                              │
│  ├─ sendCancellationNotice()                               │
│  ├─ sendAccountUpdateEmail()              [NEW]            │
│  └─ sendLoginAlertEmail()                 [NEW]            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                   UNDERLYING SERVICES                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SMS Gateway Service          Email Service                 │
│  ├─ SMS API (FREE)            ├─ Gmail SMTP                │
│  ├─ OTP sending               ├─ HTML Templates             │
│  ├─ Cancellation SMS          ├─ OTP emails                │
│  └─ Booking SMS               ├─ Account updates            │
│                               └─ Login alerts               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                    DATABASE (MongoDB)                        │
├─────────────────────────────────────────────────────────────┤
│  OTP Model          User Model          Appointment Model   │
│  ├─ phone           ├─ email            ├─ user             │
│  ├─ email           ├─ phone            ├─ date             │
│  ├─ otp             ├─ password         ├─ timeSlot         │
│  ├─ type            ├─ isVerified       ├─ status           │
│  ├─ method          └─ isBlocked        └─ cancelledBy      │
│  ├─ expiresAt                                              │
│  └─ attempts                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Features

```
┌─────────────────────────────────────────────────────────────┐
│            SECURITY & PROTECTION LAYERS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Rate Limiting                                            │
│     • SMS: 5 per day                                        │
│     • Email: 10 per day                                     │
│     • Prevents: Brute force, spam                           │
│                                                              │
│  ✅ Time-based Throttling                                    │
│     • 1-minute cooldown between requests                    │
│     • Prevents: Rapid fire attacks                          │
│                                                              │
│  ✅ OTP Expiration                                           │
│     • 5-minute validity window                              │
│     • Auto-delete after expiry                              │
│     • Prevents: Old OTP reuse                               │
│                                                              │
│  ✅ Account Status Checks                                    │
│     • Blocked account detection                             │
│     • Already registered check                              │
│     • User existence validation                             │
│                                                              │
│  ✅ Method Validation                                        │
│     • Phone format validation (Indian)                      │
│     • Email format validation                               │
│     • Contact method availability check                     │
│                                                              │
│  ✅ Fallback Notifications                                   │
│     • SMS fails? Try email                                  │
│     • Email fails? SMS may still work                       │
│     • Console logging for development                       │
│                                                              │
│  ✅ Update Notifications                                     │
│     • Users notified of account changes                     │
│     • Login alerts sent automatically                       │
│     • Security warnings included                            │
│                                                              │
│  ✅ Authorization Checks                                     │
│     • Only user can cancel own appointment                  │
│     • Admin can cancel any appointment                      │
│     • Only user can view own data                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📈 Daily OTP Quota

```
DAY 1
├─ User A: SMS(1/5) Email(1/10)
├─ User B: SMS(2/5) Email(3/10)
├─ User C: SMS(3/5) Email(2/10)
└─ ...UNTIL...
   └─ User X: SMS(5/5) Email(10/10) ← MAX REACHED

NEXT DAY (12:00 AM)
└─ Counters Reset
   ├─ User A: SMS(0/5) Email(0/10)
   ├─ User B: SMS(0/5) Email(0/10)
   └─ All users: Fresh quota
```

---

## 🎯 Use Case Matrix

```
┌────────────────────────────────────────────────────────────┐
│                    USE CASE MATRIX                          │
├────────────────────────────────────────────────────────────┤
│ Scenario          │ SMS | Email | Method | Limit  | Auto   │
├────────────────────────────────────────────────────────────┤
│ Register          │  ✅ │  ✅  │ User  │ 5/10  │  No    │
│ Login             │  ✅ │  ✅  │ User  │ 5/10  │  No    │
│ Password Reset    │  ✅ │  ✅  │ User  │ 5/10  │  No    │
│ Profile Update    │  ❌ │  ✅  │ Auto  │ None  │  Yes   │
│ Password Changed  │  ❌ │  ✅  │ Auto  │ None  │  Yes   │
│ Login Alert       │  ❌ │  ✅  │ Auto  │ None  │  Yes   │
│ Cancel Appt       │  ✅ │  ✅  │ Auto  │ None  │  Yes   │
│ Booking Confirm   │  ✅ │  ✅  │ Auto  │ None  │  Yes   │
└────────────────────────────────────────────────────────────┘

Legend:
✅ = Available/Enabled
❌ = Not Available/Disabled
User = User chooses method
Auto = Automatic, no user choice
None = No rate limit applied
5/10 = SMS limit 5, Email limit 10
```

---

## 📝 Data Flow Example: Registration

```
Frontend Form:
┌─────────────────────────┐
│ Phone: +919876543210    │
│ Email: user@email.com   │
│ Send OTP via: [SMS]     │ ← User selects
└─────────────────────────┘
          ↓
POST /send-otp
{
  phone: "+919876543210",
  email: "user@email.com",
  sendVia: "sms"
}
          ↓
Backend:
1. Validate phone format ✓
2. Check not already registered ✓
3. Clean expired OTPs ✓
4. Check rate limit (SMS: 1/5) ✓
5. Generate OTP: 654321
6. Save to MongoDB
   {
     phone: "+919876543210",
     email: "user@email.com",
     otp: "654321",
     method: "sms",
     type: "registration",
     expiresAt: 2024-12-19T15:35:00Z,
     createdAt: 2024-12-19T15:30:00Z
   }
7. Send via SMS Gateway ✓
          ↓
Response:
{
  success: true,
  message: "✅ OTP sent to +919876543210",
  method: "sms",
  identifier: "+919876543210",
  alternativeMethod: "email",
  expiryTime: 5
}
          ↓
Frontend:
- Show "OTP sent to +919876543210"
- Display alternative: "Or use Email"
- Start 5-min countdown
- Show input field for OTP
```

---

## Summary Table

| Component | Old | New | Change |
|-----------|-----|-----|--------|
| `/send-otp` | SMS only | SMS + Email option | 🔄 Enhanced |
| `/forgot-password` | Email primary | User choice (Email/SMS) | ✨ New |
| Account updates | None | Email notifications | ✨ New |
| Login alerts | None | Email notifications | ✨ New |
| SMS limit | 5/day | 5/day | Unchanged |
| Email limit | None | 10/day | ✨ New |
| Appointment cancel | SMS + Email | SMS + Email | Unchanged |

**Total New Features: 4**
**Total Enhanced Features: 2**
**Breaking Changes: 0**
