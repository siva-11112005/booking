const PRICING = {
  consultation: {
    regular: 500,
    followUp: 350,
    emergency: 800
  },
  
  treatments: {
    backPain: 600,
    neckPain: 550,
    kneePain: 600,
    shoulderPain: 600,
    sportsInjury: 700,
    other: 500
  },
  
  packages: {
    package5: {
      sessions: 5,
      price: 2250,
      discount: 10
    },
    package10: {
      sessions: 10,
      price: 4250,
      discount: 15
    },
    package20: {
      sessions: 20,
      price: 8000,
      discount: 20
    }
  },
  
  tax: {
    gst: 18, // GST percentage
    includeInPrice: true
  },
  
  currency: 'INR',
  symbol: '₹'
};

// Calculate amount with GST
const calculateAmount = (baseAmount, includeTax = true) => {
  if (!includeTax || PRICING.tax.includeInPrice) {
    return baseAmount;
  }
  return baseAmount + (baseAmount * PRICING.tax.gst / 100);
};

// Get consultation fee based on type and pain type
const getConsultationFee = (painType = 'other', consultationType = 'regular') => {
  let baseAmount = PRICING.treatments[painType] || PRICING.consultation[consultationType];
  return calculateAmount(baseAmount);
};

module.exports = {
  PRICING,
  calculateAmount,
  getConsultationFee
};