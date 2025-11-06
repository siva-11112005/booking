import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendOTP, verifyOTP } from '../services/api';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
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

const handleSendOTP = async (preferEmail = false) => {
  // Frontend validation
  if (!formData.name.trim()) {
    setError('Please enter your name');
    return;
  }

  if (!formData.phone.trim() && !formData.email.trim()) {
    setError('Please enter either phone number or email');
    return;
  }

  if (formData.phone.trim() && formData.phone.trim().length !== 10) {
    setError('Please enter a valid 10-digit mobile number');
    return;
  }

  if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    setError('Please enter a valid email address');
    return;
  }

  if (!formData.password.trim()) {
    setError('Please enter a password');
    return;
  }

  if (formData.password.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  if (!formData.confirmPassword.trim()) {
    setError('Please confirm your password');
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  try {
    setLoading(true);
    setError('');
    
    const payload = {
      preferEmail
    };

    if (formData.phone.trim()) {
      let phone = formData.phone.trim();
      if (!phone.startsWith('+91')) {
        phone = '+91' + phone.replace(/^0+/, '');
      }
      payload.phone = phone;
    }

    if (formData.email.trim()) {
      payload.email = formData.email.trim();
    }

    await sendOTP(payload);
    setOtpSent(true);
    setOtpTimer(300);
    setSuccess(`OTP sent successfully to your ${preferEmail ? 'email' : 'phone'}! Valid for 5 minutes.`);
    setStep(2);
    setTimeout(() => setSuccess(''), 5000);
  } catch (err) {
    setError(err.response?.data?.message || 'Failed to send OTP');
  } finally {
    setLoading(false);
  }
};
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!formData.otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);

    try {
      let phone = formData.phone.trim();
      if (!phone.startsWith('+91')) {
        phone = '+91' + phone.replace(/^0+/, '');
      }

      const registrationData = {
        phone,
        otp: formData.otp,
        name: formData.name,
        password: formData.password
      };

      // Add email only if provided
      if (formData.email && formData.email.trim()) {
        registrationData.email = formData.email.trim();
      }

      const response = await verifyOTP(registrationData);

      // Store auth token and user data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      setSuccess('Registration successful! Logging you in...');
      
      // Trigger auto-login by dispatching user data to auth context
      if (onLoginSuccess) {
        onLoginSuccess(response.data);
      }
      
      // Show success message briefly before redirect
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
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
          📱 Create New Account
        </h2>
        
        <div style={{ textAlign: 'center', marginBottom: '25px', color: '#666', fontSize: '0.95em' }}>
          Indian Mobile Numbers Only • OTP Verification Required • Email Optional
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {step === 1 ? (
          <form onSubmit={(e) => { e.preventDefault(); handleSendOTP(); }}>
            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Indian Mobile Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="10 digits (6-9 starting)"
                pattern="[6-9][0-9]{9}"
                maxLength="10"
              />
              <div className="form-note">
                Enter 10-digit mobile number without +91 or 0
              </div>
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Email (Optional)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com (optional)"
              />
              <div className="form-note">
                Email is optional. You can login with phone or email later.
              </div>
            </div>

            <div className="form-group">
              <label>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
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
                Confirm Password *
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
                onClick={() => navigate('/')}
                className="btn-modal btn-modal-cancel"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn-modal btn-modal-submit"
                disabled={loading}
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
            {formData.email && (
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSendOTP(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#e67e22',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '0.9em'
                  }}
                >
                  Get code via email instead
                </button>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ padding: '25px', background: '#e8f5e9', borderRadius: '12px', marginBottom: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.1em', marginBottom: '10px', color: '#155724' }}>
                ✅ OTP sent to +91{formData.phone}
              </div>
              <div style={{ fontSize: '0.95em', color: '#666' }}>
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

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => {
                  setStep(1);
                  setOtpSent(false);
                  setOtpTimer(0);
                  setFormData({ ...formData, otp: '' });
                }}
                className="btn-modal btn-modal-cancel"
              >
                Change Number
              </button>
              <button 
                type="submit"
                className="btn-modal btn-modal-submit"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Register'}
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
                  Resend OTP
                </button>
              </div>
            )}
          </form>
        )}

        <div className="modal-footer" style={{ marginTop: '30px' }}>
          Already have an account?
          <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;