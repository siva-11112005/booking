import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../services/api';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const sendVia = 'sms'; // default method when not specified
  const [otpMethod, setOtpMethod] = useState(''); // Track which method was used
  const navigate = useNavigate();

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0 && otpSent) {
      setOtpSent(false);
    }
  }, [otpTimer, otpSent]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSendOTP = async (via) => {
  // Frontend validation
  const method = via || sendVia;
  if (method === 'sms') {
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (formData.phone.trim().length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
  } else {
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }
  }

  try {
    setLoading(true);
    setError('');
    
    let phone = '';
    let email = '';

    if (method === 'sms') {
      phone = formData.phone.trim();
      if (!phone.startsWith('+91')) {
        phone = '+91' + phone.replace(/^0+/, '');
      }
    } else {
      email = formData.email.trim().toLowerCase();
    }

    await forgotPassword({
      phone,
      email,
      sendVia: method
    });

    setOtpMethod(method);
    setOtpSent(true);
    setOtpTimer(300);
    
    const methodText = method === 'sms' ? `to +91${formData.phone}` : `to ${formData.email}`;
    setSuccess(`✅ OTP sent ${methodText}! Valid for 5 minutes.`);
    setStep(2);
    setTimeout(() => setSuccess(''), 5000);
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to send OTP');
  } finally {
    setLoading(false);
  }
};

const handleResetPassword = async (e) => {
  e.preventDefault();
  setError('');

  // Frontend validation
  if (!formData.otp.trim()) {
    setError('Please enter the OTP');
    return;
  }

  if (!formData.newPassword.trim()) {
    setError('Please enter a new password');
    return;
  }

  if (formData.newPassword.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  if (!formData.confirmPassword.trim()) {
    setError('Please confirm your password');
    return;
  }

  if (formData.newPassword !== formData.confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  setLoading(true);

  try {
    let phone = '';
    let email = '';

    if (otpMethod === 'sms') {
      phone = formData.phone.trim();
      if (!phone.startsWith('+91')) {
        phone = '+91' + phone.replace(/^0+/, '');
      }
    } else {
      email = formData.email.trim().toLowerCase();
    }

    await resetPassword({
      phone,
      email,
      otp: formData.otp,
      newPassword: formData.newPassword
    });

    setSuccess('✅ Password reset successfully! Redirecting to login...');
    setTimeout(() => navigate('/login'), 2000);
  } catch (err) {
    setError(err.response?.data?.message || 'Password reset failed');
  } finally {
    setLoading(false);
  }
};
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">
          🔑 Reset Password
        </h2>
        
        <div style={{ textAlign: 'center', marginBottom: '25px', color: '#666', fontSize: '0.95em' }}>
          Recover your account using OTP verification
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); }}>
            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Registered Mobile Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10 digits"
                pattern="[6-9][0-9]{9}"
                maxLength="10"
              />
              <div className="form-note">
                Enter your registered 10-digit mobile number. OTP will be sent via SMS.
              </div>
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Registered Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
              />
              <div className="form-note">
                Enter your registered email address. OTP will be sent via email.
              </div>
              <div className="form-note" style={{ marginTop: '8px' }}>
                No email on file? Update it in your <Link to="/profile">Profile</Link>.
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => navigate('/login')}
                className="btn-modal btn-modal-cancel"
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button"
                  className="btn-modal btn-modal-submit"
                  disabled={loading || !formData.phone}
                  onClick={(e) => { e.preventDefault(); handleSendOTP('sms'); }}
                >
                  {loading ? 'Sending...' : 'Send via SMS'}
                </button>
                <button 
                  type="button"
                  className="btn-modal btn-modal-submit"
                  disabled={loading || !formData.email}
                  onClick={(e) => { e.preventDefault(); handleSendOTP('email'); }}
                >
                  {loading ? 'Sending...' : 'Send via Email'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div style={{ padding: '25px', background: '#e8f5e9', borderRadius: '12px', marginBottom: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1em', marginBottom: '10px', color: '#155724', fontWeight: '600' }}>
                ✅ OTP Sent Successfully
              </div>
              <div style={{ fontSize: '0.95em', color: '#666', marginBottom: '8px' }}>
                {otpMethod === 'sms' 
                  ? `📱 Sent to: +91${formData.phone}` 
                  : `📧 Sent to: ${formData.email}`
                }
              </div>
              <div style={{ fontSize: '0.9em', color: '#666' }}>
                Valid for 5 minutes • Max 3 attempts
              </div>
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Enter OTP *
              </label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                required
                placeholder="6-digit OTP"
                maxLength="6"
                pattern="[0-9]{6}"
              />
              {otpTimer > 0 && (
                <div className="form-note" style={{ color: '#e67e22', fontWeight: '600' }}>
                  Time remaining: {formatTime(otpTimer)}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                New Password *
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                minLength="8"
                placeholder="Minimum 8 characters"
              />
              <div className="form-note">
                Minimum 8 characters required
              </div>
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Confirm New Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength="8"
                placeholder="Re-enter password"
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => {
                  setStep(1);
                  setOtpSent(false);
                  setOtpTimer(0);
                  setOtpMethod('');
                  setFormData({ 
                    phone: formData.phone, 
                    email: formData.email,
                    otp: '', 
                    newPassword: '', 
                    confirmPassword: '' 
                  });
                }}
                className="btn-modal btn-modal-cancel"
              >
                {otpMethod === 'sms' ? 'Use Email Instead' : 'Use Mobile Instead'}
              </button>
              <button 
                type="submit"
                className="btn-modal btn-modal-submit"
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>

            {otpTimer === 0 && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={handleSendOTP}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e67e22',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '1em',
                    textDecoration: 'underline'
                  }}
                >
                  🔄 Resend OTP
                </button>
              </div>
            )}
          </form>
        )}

        <div className="modal-footer" style={{ marginTop: '30px' }}>
          Remember your password?
          <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;