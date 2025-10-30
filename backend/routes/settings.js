const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { adminAuth } = require('../middleware/auth');

// Get pricing settings
router.get('/pricing', adminAuth, async (req, res) => {
  try {
    let settings = await Settings.findOne({ type: 'pricing' });
    
    if (!settings) {
      const { PRICING } = require('../config/pricing');
      settings = await Settings.create({
        type: 'pricing',
        data: PRICING
      });
    }
    
    res.json({ success: true, pricing: settings.data });
  } catch (error) {
    console.error('Get Pricing Settings Error:', error);
    res.status(500).json({ message: 'Failed to get pricing settings' });
  }
});

// Update pricing settings
router.put('/pricing', adminAuth, async (req, res) => {
  try {
    const { pricing } = req.body;
    
    let settings = await Settings.findOne({ type: 'pricing' });
    
    if (settings) {
      settings.data = pricing;
      settings.updatedAt = new Date();
      await settings.save();
    } else {
      settings = await Settings.create({
        type: 'pricing',
        data: pricing
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Pricing updated successfully',
      pricing: settings.data 
    });
  } catch (error) {
    console.error('Update Pricing Error:', error);
    res.status(500).json({ message: 'Failed to update pricing' });
  }
});

module.exports = router;