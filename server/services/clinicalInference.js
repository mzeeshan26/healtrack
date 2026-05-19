const Threshold = require('../models/Threshold');
const Vitals = require('../models/Vitals');
const ClinicalInsight = require('../models/ClinicalInsight');
const { HISTORY_WINDOW, INSIGHT_COOLDOWN_MS } = require('../config/clinicalConfig');
const { VITAL_DEFINITIONS, getVitalAbnormalities } = require('./vitalChecks');
const {
  getPatientTrackerState,
  tickVitalTracker,
  getBadgeLabel,
  formatDuration,
  CONFIRM_READINGS,
  ESCALATION_MS,
} = require('./abnormalityTracker');
const { evaluateCompositeRules } = require('../rules/clinicalRules');

/** Last persisted insight per patient+rule (cooldown) */
const insightCooldown = new Map();

function buildVitalPublicState(key, tracker, abn) {
  return {
    key,
    label: abn.label,
    abnormal: abn.abnormal,
    detail: abn.detail || tracker.lastDetail,
    phase: tracker.phase,
    severity: tracker.severity,
    consecutiveAbnormal: tracker.consecutiveAbnormal,
    consecutiveNormal: tracker.consecutiveNormal,
    durationMs: tracker.durationMs,
    durationLabel: formatDuration(tracker.durationMs),
    badgeLabel: getBadgeLabel(tracker),
    confirmProgress: `${Math.min(tracker.consecutiveAbnormal, CONFIRM_READINGS)}/${CONFIRM_READINGS}`,
    escalationAtMs: ESCALATION_MS,
    timeline: tracker.timeline,
  };
}

async function maybePersistInsight(patientId, rule, vitals) {
  const cooldownKey = `${patientId}:${rule.id}`;
  const last = insightCooldown.get(cooldownKey) || 0;
  if (Date.now() - last < INSIGHT_COOLDOWN_MS) return null;

  const severity = rule.severityHint === 'critical' ? 'critical' : 'warning';
  const doc = await ClinicalInsight.create({
    patientId,
    ruleId: rule.id,
    label: rule.label,
    severity,
    evidence: rule.evidence,
    disclaimer: rule.disclaimer,
    vitalsSnapshot: {
      heartRate: vitals.heartRate,
      spo2: vitals.spo2,
      temperature: vitals.temperature,
      ecgStatus: vitals.ecgStatus,
    },
  });

  insightCooldown.set(cooldownKey, Date.now());
  return doc;
}

/**
 * Run noise-filtered trackers + composite rules after each vitals packet.
 */
async function processClinicalInference(patientId, vitals, io) {
  const thresholds = await Threshold.findOne({ patientId });
  if (!thresholds) return null;

  const history = await Vitals.find({ patientId })
    .select('-ecgBuffer')
    .sort({ timestamp: -1 })
    .limit(HISTORY_WINDOW);

  const abnormalities = getVitalAbnormalities(vitals, thresholds);
  const state = getPatientTrackerState(patientId);

  const vitalStates = {};
  for (const key of Object.keys(VITAL_DEFINITIONS)) {
    const abn = abnormalities[key];
    tickVitalTracker(state.vitals[key], abn.abnormal, abn.detail);
    vitalStates[key] = buildVitalPublicState(key, state.vitals[key], abn);
  }

  const compositeRules = evaluateCompositeRules(
    vitals,
    thresholds,
    history,
    state.vitals
  );

  const newInsights = [];
  for (const rule of compositeRules) {
    const saved = await maybePersistInsight(patientId, rule, vitals);
    if (saved) newInsights.push(saved);
  }

  const activeAlerts = [];

  for (const [key, vs] of Object.entries(vitalStates)) {
    if (vs.phase === 'warning' || vs.phase === 'critical') {
      activeAlerts.push({
        type: 'vital',
        id: key,
        label: vs.detail || vs.label,
        severity: vs.severity,
        badgeLabel: vs.badgeLabel,
        durationLabel: vs.durationLabel,
        phase: vs.phase,
      });
    }
  }

  for (const rule of compositeRules) {
    activeAlerts.push({
      type: 'composite',
      id: rule.id,
      label: rule.label,
      severity: rule.severityHint || 'warning',
      evidence: rule.evidence,
    });
  }

  const payload = {
    patientId: String(patientId),
    evaluatedAt: new Date().toISOString(),
    vitals: vitalStates,
    compositeRules,
    activeAlerts,
    demoHints: {
      confirmAtSec: 6,
      escalationAtMin: 2,
      confirmReadings: CONFIRM_READINGS,
    },
  };

  if (io) {
    io.emit(`clinicalState_${patientId}`, payload);
    for (const insight of newInsights) {
      io.emit(`clinicalInsight_${patientId}`, insight);
    }
  }

  return payload;
}

module.exports = { processClinicalInference, getPatientTrackerState };
