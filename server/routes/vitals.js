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
    }
    
    res.json(newVitals);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
