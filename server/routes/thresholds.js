const express = require('express');
const router = express.Router();
const Threshold = require('../models/Threshold');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Get thresholds for a patient
router.get('/:patientId', auth, async (req, res) => {
  try {
    const threshold = await Threshold.findOne({ patientId: req.params.patientId });
    if (!threshold) return res.status(404).json({ message: 'Thresholds not found' });
    res.json(threshold);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Update thresholds (Doctor only)
router.put('/:patientId', auth, role(['doctor']), async (req, res) => {
  try {
    const threshold = await Threshold.findOneAndUpdate(
      { patientId: req.params.patientId },
      { $set: req.body },
      { new: true, upsert: true } // Create if doesn't exist just in case
    );
    res.json(threshold);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
