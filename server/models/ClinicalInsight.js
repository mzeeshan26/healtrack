const mongoose = require('mongoose');

const clinicalInsightSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  ruleId: { type: String, required: true },
  label: { type: String, required: true },
  severity: { type: String, enum: ['warning', 'critical'], default: 'warning' },
  evidence: [{ type: String }],
  disclaimer: { type: String },
  vitalsSnapshot: {
    heartRate: Number,
    spo2: Number,
    temperature: Number,
    ecgStatus: String,
  },
  acknowledged: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

clinicalInsightSchema.index({ patientId: 1, ruleId: 1, timestamp: -1 });

module.exports = mongoose.model('ClinicalInsight', clinicalInsightSchema);
