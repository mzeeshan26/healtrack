const express = require('express');
const router = express.Router();
const ClinicalInsight = require('../models/ClinicalInsight');
const auth = require('../middleware/auth');
const Vitals = require('../models/Vitals');
const { getPatientTrackerState, processClinicalInference } = require('../services/clinicalInference');
const { formatDuration, getBadgeLabel } = require('../services/abnormalityTracker');

// Re-run inference on latest saved vitals (e.g. dashboard load)
router.post('/:patientId/reevaluate', auth, async (req, res) => {
  try {
    const vitals = await Vitals.findOne({ patientId: req.params.patientId }).sort({ timestamp: -1 });
    if (!vitals) return res.status(200).json({ message: 'No vitals to evaluate' });
    const io = req.app.get('socketio');
    const state = await processClinicalInference(req.params.patientId, vitals, io);
    res.json(state || { message: 'Evaluation skipped' });
  } catch (err) {
    console.error('[insights] reevaluate', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Live tracker snapshot (in-memory; resets on server restart)
router.get('/:patientId/state', auth, async (req, res) => {
  try {
    const state = getPatientTrackerState(req.params.patientId);
    const vitals = {};
    for (const [key, tracker] of Object.entries(state.vitals)) {
      vitals[key] = {
        phase: tracker.phase,
        severity: tracker.severity,
        durationMs: tracker.durationMs,
        durationLabel: formatDuration(tracker.durationMs),
        badgeLabel: getBadgeLabel(tracker),
        timeline: tracker.timeline,
        consecutiveAbnormal: tracker.consecutiveAbnormal,
        consecutiveNormal: tracker.consecutiveNormal,
      };
    }
    res.json({ vitals, evaluatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// Persisted composite / clinical insights log
router.get('/:patientId/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const insights = await ClinicalInsight.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.patch('/:insightId/ack', auth, async (req, res) => {
  try {
    const insight = await ClinicalInsight.findByIdAndUpdate(
      req.params.insightId,
      { acknowledged: true },
      { new: true }
    );
    if (!insight) return res.status(404).json({ message: 'Insight not found' });
    res.json(insight);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
