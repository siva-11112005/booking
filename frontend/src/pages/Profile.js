import React, { useContext, useState } from 'react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);
  const [sendVia, setSendVia] = useState('email'); // default method; selection UI removed
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState(user?.name || '');

  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordOtp, setPasswordOtp] = useState('');

  const requestOtp = async (target, method) => {
    try {
      setLoading(true);
      setError('');
      setStatus('');
      if (target !== 'password') {
        setError('OTP is required only for password changes');
      } else {
        const via = method || sendVia;
        await api.post('/auth/send-change-otp', { target, sendVia: via });
        setSendVia(via);
        setStatus(`OTP sent via ${via} for password change. Valid for 5 minutes.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const submitEmailChange = async (e) => {
    e.preventDefault();
    const trimmed = (newEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed || !emailRegex.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.put('/auth/update-profile', { email: trimmed });
      setStatus('✅ Email updated successfully');
      setUser({ ...user, email: trimmed });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  const submitNameChange = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.put('/auth/update-profile', { name: newName.trim() });
      setStatus('✅ Name updated successfully');
      setUser({ ...user, name: newName.trim() });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update name');
    } finally {
      setLoading(false);
    }
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!/^\d{6}$/.test(passwordOtp)) {
      setError('Enter a valid 6-digit OTP');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.post('/auth/confirm-change', { target: 'password', otp: passwordOtp, newPassword });
      setStatus('✅ Password changed successfully');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOtp('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="booking-section">
        <div className="booking-card">
          <div style={{
            background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
            color: 'white', padding: '40px', borderRadius: '20px 20px 0 0',
            margin: '-60px -50px 40px -50px', textAlign: 'center'
          }}>
            <h1 style={{ fontSize: '2.0em', marginBottom: '8px', fontWeight: '700' }}>Profile</h1>
            <p>Update your name and password with OTP verification</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {status && <div className="alert alert-success">{status}</div>}

          {/* Prompt to add email if not set */}
          {!user?.email && (
            <div style={{ background: '#fff3cd', color: '#856404', padding: '16px 20px', borderRadius: '12px', border: '1px solid #ffeeba', marginBottom: '16px' }}>
              <strong>Action recommended:</strong> No email on file. Add your email below to enable OTP via email and account recovery.
            </div>
          )}

          {/* Removed top OTP method selection as requested */}

          {/* Change Name (no OTP required) */}
          <div style={{ background: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2em', marginBottom: 12 }}>
              <span>✏️</span> Change Name
            </h2>
            <form onSubmit={submitNameChange}>
              <div className="form-group">
                <label>New Name *</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-modal btn-modal-submit" disabled={loading}>Update Name</button>
              </div>
            </form>
          </div>

          {/* Change Email (no OTP required) */}
          <div style={{ background: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '24px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2em', marginBottom: 12 }}>
              <span>📧</span> Change Email
            </h2>
            <form onSubmit={submitEmailChange}>
              <div className="form-group">
                <label>New Email *</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-modal btn-modal-submit" disabled={loading}>Update Email</button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div style={{ background: '#f8f9fa', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.2em', marginBottom: 12 }}>
              <span>🔐</span> Change Password
            </h2>
            <form onSubmit={submitPasswordChange}>
              <div className="form-group">
                <label>New Password *</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
              </div>
              <div className="form-group">
                <label>OTP *</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="text" value={passwordOtp} onChange={(e) => setPasswordOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} />
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 12 }}>
                  <button type="button" className="btn-modal" onClick={() => requestOtp('password', 'sms')} disabled={loading}>
                    {loading ? 'Sending...' : 'Send via SMS'}
                  </button>
                  <button type="button" className="btn-modal" onClick={() => requestOtp('password', 'email')} disabled={loading || !user?.email}>
                    {loading ? 'Sending...' : 'Send via Email'}
                  </button>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-modal btn-modal-submit" disabled={loading}>Change Password</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
