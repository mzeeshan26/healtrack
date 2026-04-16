const express = require('express');
const router = express.Router();
const Vitals = require('../models/Vitals');
const auth = require('../middleware/auth');

// Get latest vitals
router.get('/:patientId/latest', auth, async (req, res) => {
  try {
    const vitals = await Vitals.findOne({ patientId: req.params.patientId }).sort({ timestamp: -1 });
    if (!vitals) return res.status(200).json(null);
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get vitals history
router.get('/:patientId/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const vitals = await Vitals.find({ patientId: req.params.patientId })
                               .sort({ timestamp: -1 })
                               .limit(limit);
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Manual post for mock data testing (or API fallback)
router.post('/:patientId', auth, async (req, res) => {
  try {
    const { heartRate, spo2, temperature, ecgStatus, ecgRaw } = req.body;
    const newVitals = new Vitals({
      patientId: req.params.patientId,
      heartRate, spo2, temperature, ecgStatus, ecgRaw
    });
    await newVitals.save();
    
    // In a real scenario with MQTT, the MQTT client saves it and we emit via Socket.
    // If the POST is used, we should also broadcast via Socket.io.
    const io = req.app.get('socketio');
    if (io) {
      io.emit(`vitalsUpdate_${req.params.patientId}`, newVitals);
      
      // Also check thresholds and emit alerts if needed
      const Threshold = require('../models/Threshold');
      const thresholds = await Threshold.findOne({ patientId: req.params.patientId });
      if (thresholds) {
         let alerts = [];
         if (heartRate < thresholds.heartRate.min) alerts.push(`CRITICAL: Heart Rate dropped to ${heartRate} BPM (Min: ${thresholds.heartRate.min})`);
         else if (heartRate > thresholds.heartRate.max) alerts.push(`WARNING: Heart Rate spiked to ${heartRate} BPM (Max: ${thresholds.heartRate.max})`);
         
         if (spo2 < thresholds.spo2.min) alerts.push(`CRITICAL: SpO2 dropped to ${spo2}% (Min: ${thresholds.spo2.min}%)`);
         
         if (temperature < thresholds.temperature.min) alerts.push(`WARNING: Temperature dropped to ${temperature}°C (Min: ${thresholds.temperature.min}°C)`);
         else if (temperature > thresholds.temperature.max) alerts.push(`WARNING: Temperature spiked to ${temperature}°C (Max: ${thresholds.temperature.max}°C)`);
         
         if (alerts.length > 0) {
            io.emit(`vitalsAlert_${req.params.patientId}`, { alerts, vitals: newVitals });
         }
      }
    }
    
    res.json(newVitals);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
