export const PRICING = {
  consultation: {
    regular: 5,
    followUp: 3,
    emergency: 8
  },
  
  treatments: {
    'Back Pain': 6,
    'Neck Pain': 5,
    'Knee Pain': 6,
    'Shoulder Pain': 6,
    'Sports Injury': 7,
    'Other': 5
  },
  
  packages: [
    {
      id: 'package5',
      sessions: 5,
      price: 2250,
      discount: 10,
      perSession: 450
    },
    {
      id: 'package10',
      sessions: 10,
      price: 4250,
      discount: 15,
      perSession: 425
    },
    {
      id: 'package20',
      sessions: 20,
      price: 8000,
      discount: 20,
      perSession: 400
    }
  ],
  
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