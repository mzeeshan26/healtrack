const mongoose = require('mongoose');

const thresholdSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, unique: true },
  heartRate: {
    min: { type: Number, default: 60 },
    max: { type: Number, default: 100 }
  },
  spo2: {
    min: { type: Number, default: 95 },
    max: { type: Number, default: 100 }
  },
  temperature: {
    min: { type: Number, default: 36.1 },
    max: { type: Number, default: 37.5 }
  },
  roomTemperature: {
    min: { type: Number, default: 18.0 },
    max: { type: Number, default: 30.0 }
  },
  humidity: {
    min: { type: Number, default: 30.0 },
    max: { type: Number, default: 65.0 }
  },
  ecgStatus: {
    normalValue: { type: String, default: 'normal' }
  }
});

module.exports = mongoose.model('Threshold', thresholdSchema);
