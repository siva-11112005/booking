# Razorpay Integration Setup Guide

## 1. Create Razorpay Account (Test Mode)
1. Go to https://razorpay.com
2. Sign up for a free account
3. You'll start in TEST MODE (perfect for development)

## 2. Get API Keys
1. Login to Dashboard: https://dashboard.razorpay.com
2. Make sure you're in **Test Mode** (toggle at top)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key**
5. Copy both:
   - Key ID (starts with `rzp_test_`)
   - Key Secret (keep this safe!)

## 3. Setup Webhook Secret
1. In Dashboard, go to **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Enter details:
   - **Webhook URL**: 
     - Local: `https://your-ngrok-url.ngrok.io/api/payment/webhook`
     - Production: `https://your-app.onrender.com/api/payment/webhook`
   - **Secret**: Click "Generate Secret" and copy it
   - **Alert Email**: Your email
   - **Events**: Select:
     - ✅ payment.authorized
     - ✅ payment.captured
     - ✅ payment.failed
4. Click **Create Webhook**
5. Copy the Webhook Secret

## 4. Add to .env file
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here