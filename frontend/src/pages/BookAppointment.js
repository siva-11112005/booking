import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvailableSlots, bookAppointment } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Payment from '../components/Payment';

const BookAppointment = () => {
console.log('BookAppointment CLEAN v3'); // sanity log
const { user } = useContext(AuthContext);
const navigate = useNavigate();
const location = useLocation();

const [selectedDate, setSelectedDate] = useState(
location.state?.date || new Date().toISOString().split('T')[0]
);
const [selectedSlot, setSelectedSlot] = useState(location.state?.time || null);
const [slots, setSlots] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
const [showModal, setShowModal] = useState(false);
const [showPayment, setShowPayment] = useState(false);
const [currentAppointment, setCurrentAppointment] = useState(null);

const [bookingForm, setBookingForm] = useState({
painType: 'Other',
consultationType: 'regular',
phone: user?.phone || '',
email: user?.email || '',
reason: ''
});

// Dev mode: always ₹1
const [selectedAmount] = useState(1);

const fetchSlots = useCallback(async () => {
if (!selectedDate) return;
try {
setLoading(true);
setError('');
const response = await getAvailableSlots(selectedDate);
setSlots(response.data.slots);
} catch (err) {
setError('Failed to fetch slots');
} finally {
setLoading(false);
}
}, [selectedDate]);

useEffect(() => { fetchSlots(); }, [fetchSlots]);
useEffect(() => { if (location.state?.time) setShowModal(true); }, [location.state]);

const getMaxDate = () => {
const maxDate = new Date();
maxDate.setDate(maxDate.getDate() + 7);
return maxDate.toISOString().split('T')[0];
};

const handleSlotClick = (slot) => {
const isLunch = slot.time.includes('01:00 PM');
if (!slot.isBooked && !isLunch) {
setSelectedSlot(slot.time);
setShowModal(true);
}
};

const handleBooking = async (e) => {
e.preventDefault();
try {
setLoading(true);
setError('');
const response = await bookAppointment({
date: selectedDate,
timeSlot: selectedSlot,
painType: bookingForm.painType,
consultationType: bookingForm.consultationType,
phone: bookingForm.phone || user.phone,
email: bookingForm.email || user.email,
reason: bookingForm.reason
});
setCurrentAppointment(response.data.appointment);
setShowModal(false);
setShowPayment(true);
} catch (err) {
setError(err.response?.data?.message || 'Booking failed');
} finally {
setLoading(false);
}
};

const handlePaymentSuccess = (payment) => {
alert('✅ Appointment confirmed! Payment method: ' + (payment.method || 'clinic'));
navigate('/my-appointments');
};

const handlePaymentSkip = () => {
setShowPayment(false);
setCurrentAppointment(null);
setSelectedSlot(null);
fetchSlots();
};

const handleCloseModal = () => {
setShowModal(false);
setSelectedSlot(null);
setError('');
};

const painTypes = ['Back Pain', 'Neck Pain', 'Knee Pain', 'Shoulder Pain', 'Sports Injury', 'Other'];

const selectedDateObj = new Date(selectedDate + 'T00:00:00');
const isSunday = selectedDateObj.getDay() === 0;

const morningSlots = slots.filter(slot => {
const hour = parseInt(slot.time.split(':')[0], 10);
return hour >= 10 && hour <= 12;
});

const afternoonSlots = slots.filter(slot => slot.time.includes('PM') && !slot.time.includes('01:00 PM'));

return (
<>
<Navbar />
<div className="booking-section">
<div className="booking-card">
{/* Header */}
<div style={{
background: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)',
color: 'white',
padding: '40px',
borderRadius: '20px 20px 0 0',
margin: '-60px -50px 40px -50px',
textAlign: 'center'
}}>
<h1 style={{ fontSize: '2.2em', marginBottom: '8px', fontWeight: '700' }}>
Book Your Appointment
</h1>
<p style={{ fontSize: '1.05em', opacity: 0.95 }}>
Select date → choose time → confirm booking
</p>
</div>
{error && <div className="alert alert-error">{error}</div>}

      {/* Step 1: Date */}
      <div style={{
        background: '#f8f9fa',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid #eee'
      }}>
        <h2 style={{
          color: '#333', marginBottom: '16px', fontSize: '1.2em',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span>📅</span> Select Date
        </h2>
        <div className="date-selector">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            max={getMaxDate()}
            style={{
              width: '100%', padding: '12px 16px', fontSize: '1.05em',
              border: '2px solid #e67e22', borderRadius: '10px', cursor: 'pointer'
            }}
          />
          <div style={{ marginTop: '12px', fontSize: '1.05em', color: '#e67e22', fontWeight: 600, textAlign: 'center' }}>
            {selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Step 2: Time Slots */}
      {!loading && !isSunday && slots.length > 0 && (
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #eee' }}>
          <h2 style={{
            color: '#333', marginBottom: '16px', fontSize: '1.2em',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span>⏰</span> Choose Time Slot
          </h2>

          {morningSlots.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#666', marginBottom: '10px', fontSize: '1em', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
                🌅 Morning (10:00 AM - 1:00 PM)
              </h3>
              <div className="slots-grid">
                {morningSlots.map((slot, index) => {
                  const isLunch = slot.time.includes('01:00 PM');
                  return (
                    <div 
                      key={index}
                      className={`slot-card ${isLunch ? 'lunch' : slot.isBooked ? 'booked' : 'available'}`}
                      onClick={() => handleSlotClick(slot)}
                      style={{ cursor: (!slot.isBooked && !isLunch) ? 'pointer' : 'not-allowed' }}
                    >
                      <div className="slot-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div className="slot-time">{slot.time}</div>
                      <div className="slot-status">
                        {isLunch ? 'Lunch Break' : slot.isBooked ? '🔴 BOOKED' : '✅ AVAILABLE'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lunch */}
          <div style={{ background: '#fff3cd', padding: '10px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', color: '#856404' }}>
            🍽️ Lunch Break: 1:00 PM - 2:00 PM
          </div>

          {afternoonSlots.length > 0 && (
            <div>
              <h3 style={{ color: '#666', marginBottom: '10px', fontSize: '1em', borderBottom: '1px solid #f0f0f0', paddingBottom: '8px' }}>
                ☀️ Afternoon (2:00 PM - 5:00 PM)
              </h3>
              <div className="slots-grid">
                {afternoonSlots.map((slot, index) => (
                  <div 
                    key={index}
                    className={`slot-card ${slot.isBooked ? 'booked' : 'available'}`}
                    onClick={() => handleSlotClick(slot)}
                    style={{ cursor: !slot.isBooked ? 'pointer' : 'not-allowed' }}
                  >
                    <div className="slot-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <div className="slot-time">{slot.time}</div>
                    <div className="slot-status">
                      {slot.isBooked ? (
                        isToday ? '🔴 BOOKING CLOSED' : '🔴 BOOKED'
                      ) : (
                        <>✅ AVAILABLE<br/>
                        <span style={{fontSize: '0.8em', color: '#666'}}>
                          (Closes 30 mins before start)
                        </span></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && !showPayment && (
        <div style={{ textAlign: 'center', padding: '60px', fontSize: '1.1em', color: '#e67e22' }}>
          Loading available slots...
        </div>
      )}

      {!loading && isSunday && (
        <div className="closed-message">Clinic is closed on Sundays</div>
      )}
    </div>
  </div>

  {/* Booking Modal */}
  {showModal && (
    <div className="modal-overlay" onClick={handleCloseModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Confirm Booking</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="booking-summary">
          <div><strong>Date:</strong> {selectedDate}</div>
          <div><strong>Time:</strong> {selectedSlot}</div>
          <div><strong>Duration:</strong> 50 minutes</div>
          <div style={{ fontSize: '1.2em', color: '#e67e22', fontWeight: 'bold', marginTop: '8px' }}>
            <strong>Fee:</strong> ₹{selectedAmount}
          </div>
        </div>

        <form onSubmit={handleBooking}>
          <div className="form-group">
            <label>Select Pain Type *</label>
            <select 
              value={bookingForm.painType}
              onChange={(e) => setBookingForm({...bookingForm, painType: e.target.value})}
              required
            >
              {['Back Pain','Neck Pain','Knee Pain','Shoulder Pain','Sports Injury','Other'].map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Consultation Type *</label>
            <select 
              value={bookingForm.consultationType}
              onChange={(e) => setBookingForm({...bookingForm, consultationType: e.target.value})}
              required
            >
              <option value="regular">Regular</option>
              <option value="followUp">Follow-up</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          <div className="form-group">
            <label>Describe Your Condition (optional)</label>
            <textarea
              value={bookingForm.reason}
              onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
              placeholder="Describe your symptoms..."
              rows="4"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleCloseModal} className="btn-modal btn-modal-cancel">
              Cancel
            </button>
            <button type="submit" className="btn-modal btn-modal-submit" disabled={loading}>
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

  {/* Payment Modal */}
  {showPayment && currentAppointment && (
    <div className="modal-overlay">
      <div className="modal-content">
        <Payment 
          appointment={currentAppointment}
          amount={selectedAmount}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentSkip}
        />
      </div>
    </div>
  )}
</>
);
};

export default BookAppointment;