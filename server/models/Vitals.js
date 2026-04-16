const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  heartRate: { type: Number, required: true },
  spo2: { type: Number, required: true },
  temperature: { type: Number, required: true },
  roomTemperature: { type: Number, default: 22.0 },
  humidity: { type: Number, default: 45.0 },
  ecgStatus: { type: String, required: true },
  ecgRaw: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Create index for efficient querying
vitalsSchema.index({ patientId: 1, timestamp: -1 });

module.exports = mongoose.model('Vitals', vitalsSchema);
