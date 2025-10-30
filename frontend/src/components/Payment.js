import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import './Payment.css';

const Payment = ({ appointment, amount = 500, onSuccess, onCancel }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');

      // Create order
      const orderResponse = await api.post('/payment/create-order', {
        appointmentId: appointment._id,
        amount
      });

      const { orderId, key, paymentId } = orderResponse.data;

      // Razorpay options
      const options = {
        key,
        amount: amount * 100,
        currency: 'INR',
        name: 'Eswari Physiotherapy',
        description: `Appointment on ${new Date(appointment.date).toLocaleDateString()}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Verify payment
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
          name: appointment.user?.name,
          email: appointment.user?.email || '',
          contact: appointment.user?.phone?.replace('+91', '')
        },
        notes: {
          appointmentId: appointment._id
        },
        theme: {
          color: '#e67e22'
        },
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
      setError(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <div className="payment-header">
        <h3>{t('payment.title')}</h3>
        <span className="amount">₹{amount}</span>
      </div>
      
      {error && <div className="alert alert-error">{error}</div>}
      
      <div className="payment-details">
        <div className="payment-info">
          <span>{t('booking.consultationFee')}</span>
          <span>₹{amount}</span>
        </div>
        <div className="payment-info">
          <span>{t('appointments.date')}</span>
          <span>{new Date(appointment.date).toLocaleDateString()}</span>
        </div>
        <div className="payment-info">
          <span>{t('appointments.time')}</span>
          <span>{appointment.timeSlot}</span>
        </div>
      </div>
      
      <div className="payment-methods">
        <h4>{t('payment.method')}</h4>
        <div className="method-options">
          <label>
            <input type="radio" name="method" defaultChecked />
            <span>💳 {t('payment.card')}</span>
          </label>
          <label>
            <input type="radio" name="method" />
            <span>📱 {t('payment.upi')}</span>
          </label>
          <label>
            <input type="radio" name="method" />
            <span>🏦 {t('payment.netbanking')}</span>
          </label>
        </div>
      </div>
      
      <div className="payment-actions">
        <button 
          onClick={onCancel}
          className="btn-cancel"
          disabled={loading}
        >
          {t('booking.payLater')}
        </button>
        <button 
          onClick={handlePayment}
          className="btn-pay"
          disabled={loading}
        >
          {loading ? t('payment.processing') : t('booking.payNow')}
        </button>
      </div>
    </div>
  );
};

export default Payment;