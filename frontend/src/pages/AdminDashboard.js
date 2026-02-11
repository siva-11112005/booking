import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getAdminStats,
  getAllAppointments,
  updateAppointmentStatus,
  getAllUsers,
  blockUser,
  toggleAdmin,
  getAvailableSlots,
  getBlockedSlots
} from '../services/api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('appointments');
  const [stats, setStats] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDate, setCancelDate] = useState('');
  // Slots view state
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [expandedSlot, setExpandedSlot] = useState(null); // time string
  const [appointmentsByTime, setAppointmentsByTime] = useState({});
  const [blockedByTime, setBlockedByTime] = useState({});
  // Hover control for slots tab
  const hoverOpenTimer = useRef(null);
  const [suppressHover, setSuppressHover] = useState(false);
  const startHoverOpen = (time) => {
    if (suppressHover) return;
    clearTimeout(hoverOpenTimer.current);
    hoverOpenTimer.current = setTimeout(() => {
      setExpandedSlot(time);
    }, 120);
  };
  const cancelHoverOpen = () => {
    clearTimeout(hoverOpenTimer.current);
    hoverOpenTimer.current = null;
  };
  const closeHoverOverlay = () => {
    cancelHoverOpen();
    setExpandedSlot(null);
    setSuppressHover(true);
    setTimeout(() => setSuppressHover(false), 350);
  };

  useEffect(() => {
    fetchStats();
    fetchAppointments();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await getAdminStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await getAllAppointments();
      setAppointments(response.data.appointments);
    } catch (err) {
      setError('Failed to fetch appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlotsData = async (dateStr) => {
    try {
      setSlotsLoading(true);
      const [slotsRes, apptRes, blockedRes] = await Promise.all([
        getAvailableSlots(dateStr),
        getAllAppointments({ date: dateStr }),
        getBlockedSlots(dateStr)
      ]);
      setSlots(slotsRes.data.slots || []);
      const map = {};
      (apptRes.data.appointments || []).forEach(a => { map[a.timeSlot] = a; });
      setAppointmentsByTime(map);
      const bmap = {};
      (blockedRes.data.slots || []).forEach(b => { bmap[b.timeSlot] = b; });
      setBlockedByTime(bmap);
    } catch (err) {
      setError(t('errors.serverError'));
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getAllUsers();
      setUsers(response.data.users);
    } catch (err) {
      setError('Failed to fetch users');
    }
  };

  // Close modal on Escape key for quick dismiss
  useEffect(() => {
    if (!expandedSlot) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setExpandedSlot(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expandedSlot]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateAppointmentStatus(id, { status });
      fetchAppointments();
      fetchStats();
      alert(`${t('admin.verify')} ${status}`);
    } catch (err) {
      setError('Failed to update appointment');
    }
  };

  const handleBlockUser = async (id, isBlocked) => {
    if (!window.confirm(`Are you sure you want to ${isBlocked ? 'block' : 'unblock'} this user?`)) {
      return;
    }

    try {
      await blockUser(id, isBlocked);
      fetchUsers();
      fetchAppointments();
      alert(`User ${isBlocked ? 'blocked' : 'unblocked'} successfully!`);
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const handleToggleAdmin = async (id, isAdmin) => {
    try {
      await toggleAdmin(id, isAdmin);
      fetchUsers();
      alert(isAdmin ? 'Admin access granted' : 'Admin access removed');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle admin');
    }
  };

  const handleCancelAllForDate = () => {
    if (!cancelDate) {
      alert(t('booking.selectDate'));
      return;
    }

    if (!window.confirm(`${t('admin.cancelAll')} ${t('appointments.myAppointments')} ${cancelDate}? ${t('admin.sendSms')}`)) {
      return;
    }

    // Filter and cancel all appointments for the selected date
    const appointmentsToCancel = appointments.filter(
      apt => apt.date.split('T')[0] === cancelDate && apt.status !== 'cancelled'
    );

    Promise.all(
      appointmentsToCancel.map(apt => updateAppointmentStatus(apt._id, { status: 'cancelled' }))
    ).then(() => {
      fetchAppointments();
      fetchStats();
      alert(`${appointmentsToCancel.length} ${t('appointments.cancelled')} - ${t('admin.sendSms')}`);
      setCancelDate('');
    }).catch(() => {
      setError('Failed to cancel appointments');
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  const formatDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };
  const todayStr = new Date().toISOString().split('T')[0];
  const parseSlotStart = (slotStr, baseDateStr) => {
    try {
      const startPart = slotStr.split('-')[0].trim();
      const parts = startPart.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!parts) return null;
      let hour = parseInt(parts[1], 10);
      const minute = parseInt(parts[2], 10);
      const ampm = parts[3].toUpperCase();
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      const d = new Date(baseDateStr + 'T00:00:00');
      d.setHours(hour, minute, 0, 0);
      return d;
    } catch { return null; }
  };

  return (
    <>
      <Navbar />
      <div className="admin-section">
        <div className="admin-card">
          <h2 className="admin-title">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t('admin.dashboard')}
          </h2>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px', marginBottom: '50px' }}>
            <div style={{ background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)', color: 'white', padding: '35px 25px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 30px rgba(230, 126, 34, 0.3)' }}>
              <h3 style={{ fontSize: '3em', marginBottom: '10px' }}>{stats.totalUsers || 0}</h3>
              <p style={{ fontSize: '1.1em' }}>{t('admin.totalPatients')}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', color: 'white', padding: '35px 25px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 30px rgba(52, 152, 219, 0.3)' }}>
              <h3 style={{ fontSize: '3em', marginBottom: '10px' }}>{stats.todayAppointments || 0}</h3>
              <p style={{ fontSize: '1.1em' }}>{t('admin.todayAppointments')}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)', color: 'white', padding: '35px 25px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 30px rgba(243, 156, 18, 0.3)' }}>
              <h3 style={{ fontSize: '3em', marginBottom: '10px' }}>{stats.pendingAppointments || 0}</h3>
              <p style={{ fontSize: '1.1em' }}>{t('admin.pendingApprovals')}</p>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)', color: 'white', padding: '35px 25px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 30px rgba(46, 204, 113, 0.3)' }}>
              <h3 style={{ fontSize: '3em', marginBottom: '10px' }}>{stats.totalAppointments || 0}</h3>
              <p style={{ fontSize: '1.1em' }}>{t('admin.totalBookings')}</p>
            </div>
          </div>

          {/* Cancel All Section */}
          <div className="cancel-all-section">
            <h3>{t('admin.cancelForDate') || 'Cancel All Appointments for a Date'}</h3>
            <div className="cancel-controls">
              <input 
                type="date"
                value={cancelDate}
                onChange={(e) => setCancelDate(e.target.value)}
              />
              <button onClick={handleCancelAllForDate} className="btn-cancel-all">
                {t('admin.cancelAllSendSms') || 'Cancel All & Send SMS'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', borderBottom: '3px solid #e8e8e8' }}>
            <button
              onClick={() => setActiveTab('appointments')}
              style={{
                padding: '15px 30px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '1.1em',
                color: activeTab === 'appointments' ? '#e67e22' : '#666',
                borderBottom: activeTab === 'appointments' ? '3px solid #e67e22' : '3px solid transparent',
                marginBottom: '-3px',
                transition: 'all 0.3s'
              }}
            >
              {t('admin.appointments')}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '15px 30px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '1.1em',
                color: activeTab === 'users' ? '#e67e22' : '#666',
                borderBottom: activeTab === 'users' ? '3px solid #e67e22' : '3px solid transparent',
                marginBottom: '-3px',
                transition: 'all 0.3s'
              }}
            >
              {t('admin.users')}
            </button>
            <button
              onClick={() => {
                setActiveTab('slots');
                fetchSlotsData(slotDate);
              }}
              style={{
                padding: '15px 30px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '1.1em',
                color: activeTab === 'slots' ? '#e67e22' : '#666',
                borderBottom: activeTab === 'slots' ? '3px solid #e67e22' : '3px solid transparent',
                marginBottom: '-3px',
                transition: 'all 0.3s'
              }}
            >
              {t('admin.slots') || 'Slots'}
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {/* Appointments Tab */}
          {activeTab === 'appointments' && (
            <>
              {loading && (
                <div style={{ textAlign: 'center', padding: '100px', fontSize: '1.3em', color: '#e67e22' }}>
                  {t('admin.loadingAppointments') || 'Loading appointments...'}
                </div>
              )}

              {!loading && appointments.length === 0 && (
                <div className="empty-state">{t('appointments.noAppointments')}</div>
              )}

              {!loading && appointments.length > 0 && (
                <div className="appointments-list">
                  {appointments.map((appointment) => (
                    <div 
                      key={appointment._id}
                      className={`appointment-item ${appointment.status}`}
                    >
                      <div className="appointment-details">
                        <div><strong>{t('auth.name')}:</strong> {appointment.user?.name}</div>
                        <div><strong>{t('auth.phone')}:</strong> {appointment.user?.phone}</div>
                        <div><strong>{t('auth.email')}:</strong> {appointment.user?.email || 'N/A'}</div>
                        <div><strong>{t('appointments.date')}:</strong> {formatDate(appointment.date)}</div>
                        <div><strong>{t('appointments.time')}:</strong> {appointment.timeSlot}</div>
                        <div><strong>{t('appointments.painType')}:</strong> {appointment.painType || 'N/A'}</div>
                      </div>

                      {appointment.reason && (
                        <div style={{ marginBottom: '20px', fontSize: '1.05em' }}>
                          <strong>{t('appointments.reason') || 'Reason'}:</strong> {appointment.reason}
                        </div>
                      )}

                      <div className="appointment-actions">
                        {appointment.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(appointment._id, 'confirmed')}
                              className="btn-verify"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              {t('admin.verify')} & {t('admin.sendSms')}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(appointment._id, 'cancelled')}
                              className="btn-admin-cancel"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                              </svg>
                              {t('common.cancel')} & {t('admin.sendSms')}
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Block user ${appointment.user?.name}?`)) {
                                  handleBlockUser(appointment.user?._id, true);
                                }
                              }}
                              className="btn-block"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                              </svg>
                              {t('admin.block')} {t('common.info') ? '' : 'User'}
                            </button>
                          </>
                        )}
                        {appointment.status === 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(appointment._id, 'completed')}
                            className="btn-verify"
                          >
                            {t('appointments.completed')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Slots Tab */}
          {activeTab === 'slots' && (
            <>
              <div className="cancel-controls" style={{ marginBottom: 20 }}>
                <input
                  type="date"
                  value={slotDate}
                  onChange={(e) => {
                    const d = e.target.value;
                    setSlotDate(d);
                    fetchSlotsData(d);
                  }}
                />
              </div>
              {slotsLoading && (
                <div style={{ textAlign: 'center', padding: '60px', fontSize: '1.2em', color: '#e67e22' }}>
                  {t('common.loading')}
                </div>
              )}
              {!slotsLoading && slots.length === 0 && (
                <div className="empty-state">{t('home.viewSlots')}</div>
              )}
              {!slotsLoading && slots.length > 0 && (
                <div className="appointments-list">
                  {slots.map(s => {
                    const appt = appointmentsByTime[s.time];
                    const blocked = blockedByTime[s.time];
                    const slotStart = parseSlotStart(s.time, slotDate);
                    const isClosed = slotDate === todayStr && slotStart && (new Date() > slotStart);
                    const statusLabel = appt
                      ? t('booking.booked')
                      : blocked
                        ? (t('booking.blocked') || 'Blocked')
                        : isClosed
                          ? (t('booking.bookingClosed') || 'Booking Closed')
                          : t('booking.available');
                    const badgeClass = appt ? 'verified' : (blocked || isClosed) ? 'cancelled' : '';
                    const expanded = expandedSlot === s.time;
                    return (
                      <div key={s.time} className={`appointment-item`} onMouseEnter={() => startHoverOpen(s.time)} onMouseLeave={closeHoverOverlay}>
                        <div className="appointment-details" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div><strong>{t('appointments.time')}:</strong> {s.time}</div>
                          <span className={`status-badge ${badgeClass}`}>{statusLabel}</span>
                        </div>
                        {expanded && (
                          <div className="screen-overlay" onClick={closeHoverOverlay}>
                            <div className="hover-modal" onMouseLeave={closeHoverOverlay} onClick={(e) => e.stopPropagation()}>
                              <div className="modal-header">
                                <div className="modal-title">{t('admin.slots') || 'Slots'}</div>
                                <button className="close-btn" aria-label="Close" onClick={closeHoverOverlay}>×</button>
                              </div>
                              {appt ? (
                                <>
                                  <div className="modal-body">
                                    <div className="modal-row"><strong>{t('appointments.status')}:</strong> {t(`appointments.${appt.status}`)}</div>
                                    <div className="modal-row"><strong>{t('appointments.time')}:</strong> {s.time}</div>
                                    <div className="modal-row"><strong>{t('auth.name')}:</strong> {appt.user?.name}</div>
                                    <div className="modal-row"><strong>{t('auth.phone')}:</strong> {appt.user?.phone}</div>
                                    <div className="modal-row"><strong>{t('auth.email')}:</strong> {appt.user?.email || 'N/A'}</div>
                                    <div className="modal-row"><strong>{t('appointments.painType')}:</strong> {appt.painType || 'N/A'}</div>
                                    {appt.reason && (<div className="modal-row"><strong>{t('appointments.reason')}:</strong> {appt.reason}</div>)}
                                    <div className="modal-row"><strong>{t('appointments.date')}:</strong> {formatDateTime(appt.createdAt)}</div>
                                  </div>
                                  <div className="modal-actions">
                                    {appt.status === 'pending' && (
                                      <>
                                        <button className="btn-verify" onClick={() => handleUpdateStatus(appt._id, 'confirmed')}>{t('admin.verify')} & {t('admin.sendSms')}</button>
                                        <button className="btn-admin-cancel" onClick={() => handleUpdateStatus(appt._id, 'cancelled')}>{t('common.cancel')} & {t('admin.sendSms')}</button>
                                      </>
                                    )}
                                    {appt.status === 'confirmed' && (
                                      <button className="btn-admin-cancel" onClick={() => handleUpdateStatus(appt._id, 'cancelled')}>{t('common.cancel')} & {t('admin.sendSms')}</button>
                                    )}
                                  </div>
                                </>
                              ) : blocked ? (
                                <div className="modal-body">
                                  <div className="modal-row"><strong>{t('booking.blocked') || 'Blocked'}:</strong> {blocked.reason || t('common.info')}</div>
                                  <div className="modal-row"><strong>{t('appointments.time')}:</strong> {s.time}</div>
                                </div>
                              ) : (
                                <div className="modal-body">
                                  <div className="modal-row"><strong>{t('appointments.status')}:</strong> {t('booking.available')}</div>
                                  <div className="modal-row"><strong>{t('appointments.time')}:</strong> {s.time}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              {users.length === 0 && (
                <div className="empty-state">{t('errors.notFound') || 'No users found'}</div>
              )}

              {users.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e8e8e8' }}>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>{t('auth.name')}</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>{t('auth.phone')}</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>{t('appointments.status')}</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>{t('admin.users')}</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>{t('appointments.date')}</th>
                        <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600' }}>{t('common.edit') || 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '15px' }}>{user.name}</td>
                          <td style={{ padding: '15px' }}>{user.phone}</td>
                          <td style={{ padding: '15px' }}>
                            {user.isBlocked ? (
                              <span className="status-badge cancelled">{t('admin.block')}</span>
                            ) : (
                              <span className="status-badge verified">{t('common.success') || 'Active'}</span>
                            )}
                          </td>
                          <td style={{ padding: '15px' }}>
                            {user.isAdmin ? (
                              <span className="status-badge verified">{t('admin.dashboard')}</span>
                            ) : (
                              <span className="status-badge">{t('admin.users')}</span>
                            )}
                          </td>
                          <td style={{ padding: '15px' }}>{formatDate(user.createdAt)}</td>
                          <td style={{ padding: '15px' }}>
                            {user.isBlocked ? (
                              <button
                                onClick={() => handleBlockUser(user._id, false)}
                                className="btn-verify"
                              >
                                {t('admin.unblock')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockUser(user._id, true)}
                                className="btn-block"
                              >
                                {t('admin.block')}
                              </button>
                            )}
                            {' '}
                            {user.isAdmin ? (
                              <button
                                onClick={() => handleToggleAdmin(user._id, false)}
                                className="btn-admin-cancel"
                                style={{ marginLeft: 8 }}
                              >
                                {t('admin.cancel') || 'Remove Admin'}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleAdmin(user._id, true)}
                                className="btn-verify"
                                style={{ marginLeft: 8 }}
                              >
                                {t('admin.verify') || 'Make Admin'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;