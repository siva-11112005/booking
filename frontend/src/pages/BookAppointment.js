import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAvailableSlots, bookAppointment } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { getConsultationFee, formatAmount, PRICING } from '../config/pricing';
import Navbar from '../components/Navbar';
import Payment from '../components/Payment';

const BookAppointment = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  
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
    phone: '',
    email: '',
    reason: ''
  });

  const [selectedAmount, setSelectedAmount] = useState(500);

  useEffect(() => {
    if (selectedDate) {
      fetchSlots();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (location.state?.time) {
      setShowModal(true);
    }
  }, [location.state]);

  // Update amount when pain type or consultation type changes
  useEffect(() => {
    const amount = getConsultationFee(
      bookingForm.painType,
      bookingForm.consultationType
    );
    setSelectedAmount(amount);
  }, [bookingForm.painType, bookingForm.consultationType]);

  const fetchSlots = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAvailableSlots(selectedDate);
      setSlots(response.data.slots);
    } catch (err) {
      setError('Failed to fetch slots');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const handleSlotClick = (slot) => {
    if (!slot.isBooked && !slot.time.includes('01:00 PM')) {
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
      
      // Show payment option
      setShowPayment(true);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (payment) => {
    alert('Payment successful! Appointment confirmed.');
    navigate('/my-appointments');
  };

  const handlePaymentSkip = () => {
    alert('Appointment booked! Please pay at the clinic.');
    navigate('/my-appointments');
  };

  const painTypes = Object.keys(PRICING.treatments);

  return (
    <>
      <Navbar />
      <div className="booking-section">
        <div className="booking-card">
          <h2 className="booking-title">
            {t('booking.title')}
          </h2>

          {/* Pricing Display */}
          <div className="pricing-info" style={{
            background: '#fff3cd',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#856404' }}>
              💰 Consultation Fees
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {Object.entries(PRICING.treatments).map(([type, price]) => (
                <div key={type} style={{ 
                  background: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #ffc107'
                }}>
                  <strong>{type}:</strong> {formatAmount(price)}
                </div>
              ))}
            </div>
            
            {/* Package Offers */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ color: '#856404', marginBottom: '10px' }}>
                🎁 Package Offers (Save up to 20%)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {PRICING.packages.map(pkg => (
                  <div key={pkg.id} style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    border: '2px solid #28a745',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#28a745' }}>
                      {pkg.sessions} Sessions
                    </div>
                    <div style={{ fontSize: '1.4em', fontWeight: 'bold', margin: '10px 0' }}>
                      {formatAmount(pkg.price)}
                    </div>
                    <div style={{ color: '#dc3545', fontWeight: 'bold' }}>
                      Save {pkg.discount}%
                    </div>
                    <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                      {formatAmount(pkg.perSession)}/session
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rest of your booking component */}
          {/* Date selector, slots, etc. */}
          
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('booking.confirmBooking')}</h2>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="booking-summary">
              <div><strong>{t('appointments.date')}:</strong> {selectedDate}</div>
              <div><strong>{t('appointments.time')}:</strong> {selectedSlot}</div>
              <div><strong>{t('booking.duration')}:</strong> 50 minutes</div>
              <div style={{ 
                fontSize: '1.3em', 
                color: '#e67e22', 
                fontWeight: 'bold',
                marginTop: '10px'
              }}>
                <strong>{t('booking.consultationFee')}:</strong> {formatAmount(selectedAmount)}
              </div>
            </div>

            <form onSubmit={handleBooking}>
              <div className="form-group">
                <label>{t('booking.selectPainType')} *</label>
                <select 
                  value={bookingForm.painType}
                  onChange={(e) => setBookingForm({...bookingForm, painType: e.target.value})}
                  required
                >
                  {painTypes.map((pain, idx) => (
                    <option key={idx} value={pain}>
                      {pain} - {formatAmount(PRICING.treatments[pain])}
                    </option>
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
                  <option value="regular">
                    Regular - {formatAmount(PRICING.consultation.regular)}
                  </option>
                  <option value="followUp">
                    Follow-up - {formatAmount(PRICING.consultation.followUp)}
                  </option>
                  <option value="emergency">
                    Emergency - {formatAmount(PRICING.consultation.emergency)}
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('booking.describeCondition')}</label>
                <textarea
                  value={bookingForm.reason}
                  onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
                  placeholder="Describe your symptoms..."
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn-modal btn-modal-cancel"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit"
                  className="btn-modal btn-modal-submit"
                  disabled={loading}
                >
                  {loading ? 'Booking...' : t('booking.confirmBooking')}
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