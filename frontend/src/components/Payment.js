import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Payment.css';

const Payment = ({ appointment, amount = 1, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('clinic');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayAtClinic = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.patch(`/appointments/${appointment.id}/payment-method`, {
        paymentMethod: 'clinic'
      });

      if (response.data.success) {
        onSuccess({ method: 'clinic', appointment: response.data.appointment });
      }
    } catch (err) {
      console.error('Pay at clinic error:', err);
      setError(err.response?.data?.message || 'Failed to confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleOnlinePayment = async () => {
    try {
      setLoading(true);
      setError('');

      const orderResponse = await api.post('/payment/create-order', {
        appointmentId: appointment.id,
        amount
      });

      const { orderId, key, paymentId } = orderResponse.data;

      const options = {
        key,
        amount: amount * 100,
        currency: 'INR',
        name: 'Eswari Physiotherapy',
        description: `Appointment on ${new Date(appointment.date).toLocaleDateString()}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResponse = await api.post('/payment/verify-payment', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId
            });

            if (verifyResponse.data.success) {
              onSuccess(verifyResponse.data.payment);
            }
          } catch (err) {
            setError('Payment verification failed');
          }
        },
        prefill: {
          name: appointment.user?.name || '',
          email: appointment.user?.email || '',
          contact: appointment.user?.phone?.replace('+91', '') || ''
        },
        theme: { color: '#e67e22' },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      console.error('Online payment error:', err);
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return (
      <div className="payment-container">
        <div className="alert alert-error">
          No appointment data found. Please try booking again.
        </div>
        <button onClick={onCancel} className="btn-pay">
          Back to Booking
        </button>
      </div>
    );
  }

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h3>💰 Payment Options</h3>
        <span className="amount">₹{amount}</span>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="payment-details">
        <div className="payment-info">
          <span>Consultation Fee</span>
          <span>₹{amount}</span>
        </div>
        <div className="payment-info">
          <span>Date</span>
          <span>{new Date(appointment.date).toLocaleDateString('en-IN')}</span>
        </div>
        <div className="payment-info">
          <span>Time</span>
          <span>{appointment.timeSlot}</span>
        </div>
        <div className="payment-info">
          <span>Pain Type</span>
          <span>{appointment.painType}</span>
        </div>
      </div>
      
      <div className="payment-methods">
        <h4>Choose Payment Method</h4>
        
        <div 
          className={`payment-method-card ${paymentMethod === 'clinic' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('clinic')}
        >
          <label className="method-option">
            <input 
              type="radio" 
              name="payment" 
              value="clinic"
              checked={paymentMethod === 'clinic'}
              onChange={() => setPaymentMethod('clinic')}
            />
            <div className="method-details">
              <span className="method-icon">🏥</span>
              <div>
                <strong>Pay at Clinic</strong>
                <p>Pay ₹{amount} when you visit the clinic</p>
              </div>
            </div>
          </label>
        </div>

        <div 
          className={`payment-method-card ${paymentMethod === 'online' ? 'selected' : ''}`}
          onClick={() => setPaymentMethod('online')}
        >
          <label className="method-option">
            <input 
              type="radio" 
              name="payment" 
              value="online"
              checked={paymentMethod === 'online'}
              onChange={() => setPaymentMethod('online')}
            />
            <div className="method-details">
              <span className="method-icon">💳</span>
              <div>
                <strong>Pay Online Now</strong>
                <p>UPI, Card, Net Banking (via Razorpay)</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      <div className="payment-note">
        <p>
          <strong>💡 Note:</strong> {paymentMethod === 'clinic' 
            ? `Please bring ₹${amount} in cash when you visit the clinic. Your appointment is confirmed!`
            : 'Secure payment powered by Razorpay. You will be redirected to the payment gateway.'}
        </p>
      </div>
      
      <div className="payment-actions">
        <button 
          onClick={onCancel}
          className="btn-cancel"
          disabled={loading}
        >
          Back
        </button>
        <button 
          onClick={paymentMethod === 'clinic' ? handlePayAtClinic : handleOnlinePayment}
          className="btn-pay"
          disabled={loading}
        >
          {loading ? 'Processing...' : paymentMethod === 'clinic' ? 'Confirm Booking' : `Pay ₹${amount}`}
        </button>
      </div>
    </div>
  );
};

export default Payment;