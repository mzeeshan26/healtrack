const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Threshold = require('../models/Threshold');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// Get all patients (Doctor only — assigned to this account)
router.get('/', auth, role(['doctor']), async (req, res) => {
  try {
    const patients = await Patient.find({ assignedDoctor: req.user.id });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Get single patient
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'patient' && req.user.patientId !== req.params.id) {
       return res.status(403).json({ message: 'Access denied' });
    }
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Add new patient (Doctor only)
router.post('/', auth, role(['doctor']), async (req, res) => {
  const { name, age, gender, condition, email, password, mqttTopic } = req.body;
  try {
    let existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    let existingTopic = await Patient.findOne({ mqttTopic });
    if (existingTopic) return res.status(400).json({ message: 'MQTT Topic already assigned' });

    const newPatient = new Patient({
      name, age, gender, condition, mqttTopic, assignedDoctor: req.user.id
    });
    const savedPatient = await newPatient.save();

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name, email, password: hashedPassword, role: 'patient', patientId: savedPatient._id
    });
    await newUser.save();

    // Create default thresholds
    const newThreshold = new Threshold({ patientId: savedPatient._id });
    await newThreshold.save();

    res.json(savedPatient);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Delete patient
router.delete('/:id', auth, role(['doctor']), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    
    await User.findOneAndDelete({ patientId: req.params.id });
    await Threshold.findOneAndDelete({ patientId: req.params.id });
    await Patient.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Patient removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
