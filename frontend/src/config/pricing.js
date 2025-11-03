export const PRICING = {
  consultation: {
    regular: 1,
    followUp: 1,
    emergency: 1
  },
  
  treatments: {
    'Back Pain': 1,
    'Neck Pain': 1,
    'Knee Pain': 1,
    'Shoulder Pain': 1,
    'Sports Injury': 1,
    'Other': 1
  },
  
  currency: 'INR',
  symbol: '₹',
  
  tax: {
    gst: 18,
    includeInPrice: true
  }
};

export const getConsultationFee = (painType = 'Other', consultationType = 'regular') => {
  return PRICING.treatments[painType] || PRICING.consultation[consultationType];
};

export const formatAmount = (amount) => {
  return `${PRICING.symbol}${amount.toLocaleString('en-IN')}`;
};

export const calculateTax = (amount) => {
  if (PRICING.tax.includeInPrice) {
    return 0;
  }
  return (amount * PRICING.tax.gst) / 100;
};

export const getTotalAmount = (amount) => {
  return amount + calculateTax(amount);
};