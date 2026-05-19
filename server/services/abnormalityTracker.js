const {
  CONFIRM_READINGS,
  NORMAL_RESET_READINGS,
  SMART_RESET_MS,
  ESCALATION_MS,
} = require('../config/clinicalConfig');

/**
 * Format duration for badges: "1min 45sec" or "45sec"
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return '0sec';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}min ${sec}sec`;
  return `${sec}sec`;
}

function createVitalTracker() {
  return {
    consecutiveAbnormal: 0,
    consecutiveNormal: 0,
    phase: 'normal', // normal | building | warning | critical
    severity: null,
    abnormalSince: null,
    confirmedAt: null,
    normalSince: null,
    durationMs: 0,
    timeline: [],
    lastDetail: null,
  };
}

function pushTimeline(tracker, event, extra = {}) {
  tracker.timeline.push({
    at: new Date().toISOString(),
    event,
    ...extra,
  });
  if (tracker.timeline.length > 20) tracker.timeline.shift();
}

function fullReset(tracker) {
  tracker.consecutiveAbnormal = 0;
  tracker.consecutiveNormal = 0;
  tracker.phase = 'normal';
  tracker.severity = null;
  tracker.abnormalSince = null;
  tracker.confirmedAt = null;
  tracker.normalSince = null;
  tracker.durationMs = 0;
  pushTimeline(tracker, 'cleared');
}

/**
 * Noise-filtered per-vital state machine.
 * @param {object} tracker - mutable vital tracker
 * @param {boolean} isAbnormal - current reading
 * @param {string} detail - clinical label (e.g. Tachycardia)
 */
function tickVitalTracker(tracker, isAbnormal, detail) {
  const now = Date.now();

  if (isAbnormal) {
    tracker.consecutiveAbnormal += 1;
    tracker.consecutiveNormal = 0;
    tracker.normalSince = null;
    tracker.lastDetail = detail;

    if (!tracker.abnormalSince) {
      tracker.abnormalSince = now;
      pushTimeline(tracker, 'abnormal_started', { reading: tracker.consecutiveAbnormal });
    }

    pushTimeline(tracker, 'abnormal_reading', { count: tracker.consecutiveAbnormal });

    // Phase: building (1–2 readings) → warning (3+) → critical (2+ min sustained)
    if (tracker.consecutiveAbnormal < CONFIRM_READINGS) {
      tracker.phase = 'building';
      tracker.severity = null;
    } else if (!tracker.confirmedAt) {
      tracker.confirmedAt = now;
      tracker.phase = 'warning';
      tracker.severity = 'warning';
      pushTimeline(tracker, 'confirmed_warning', { afterReadings: CONFIRM_READINGS });
    } else {
      tracker.durationMs = now - tracker.confirmedAt;
      const sustainedMs = now - tracker.confirmedAt;
      if (sustainedMs >= ESCALATION_MS) {
        if (tracker.phase !== 'critical') {
          tracker.phase = 'critical';
          tracker.severity = 'critical';
          pushTimeline(tracker, 'escalated_critical', { sustainedMs });
        }
      } else {
        tracker.phase = 'warning';
        tracker.severity = 'warning';
        if (sustainedMs >= 60_000 && !tracker.timeline.some((e) => e.event === 'sustained_1min')) {
          pushTimeline(tracker, 'sustained_1min', { sustainedMs });
        }
      }
    }
  } else {
    tracker.consecutiveNormal += 1;
    tracker.consecutiveAbnormal = 0;

    if (!tracker.normalSince) tracker.normalSince = now;

    // Two consecutive normals → reset abnormal streak (noise filter)
    if (tracker.consecutiveNormal >= NORMAL_RESET_READINGS) {
      if (tracker.phase === 'building') {
        fullReset(tracker);
        return tracker;
      }
      if (tracker.phase === 'warning' || tracker.phase === 'critical') {
        tracker.phase = 'recovering';
        tracker.severity = 'warning';
        pushTimeline(tracker, 'normal_streak_reset', { consecutiveNormal: tracker.consecutiveNormal });
      }
    }

    // Smart reset: 30+ seconds continuously normal → full clear
    const normalDuration = now - tracker.normalSince;
    if (normalDuration >= SMART_RESET_MS) {
      if (tracker.phase !== 'normal') {
        pushTimeline(tracker, 'smart_reset', { normalDurationMs: normalDuration });
        fullReset(tracker);
      }
    } else if (tracker.confirmedAt) {
      tracker.durationMs = now - tracker.confirmedAt;
    }
  }

  if (tracker.confirmedAt && tracker.phase !== 'normal' && tracker.phase !== 'recovering') {
    tracker.durationMs = now - tracker.confirmedAt;
  }

  return tracker;
}

function getBadgeLabel(tracker) {
  if (tracker.phase === 'normal' || tracker.phase === 'building') return null;
  const dur = formatDuration(tracker.durationMs);
  const level = tracker.severity === 'critical' ? 'CRITICAL' : 'WARNING';
  if (tracker.phase === 'recovering') return `RECOVERING (${dur})`;
  if (tracker.durationMs >= ESCALATION_MS && tracker.severity === 'critical') {
    return `CRITICAL (${dur})`;
  }
  if (tracker.durationMs >= 60_000 && tracker.severity === 'warning') {
    return `WARNING — sustained ${dur}`;
  }
  return `${level} (${dur})`;
}

/** In-memory trackers per patient (resets on server restart) */
const patientTrackers = new Map();

function getPatientTrackerState(patientId) {
  const key = String(patientId);
  if (!patientTrackers.has(key)) {
    patientTrackers.set(key, {
      vitals: {
        heartRate: createVitalTracker(),
        spo2: createVitalTracker(),
        temperature: createVitalTracker(),
        ecgStatus: createVitalTracker(),
        roomTemperature: createVitalTracker(),
        humidity: createVitalTracker(),
      },
    });
  }
  return patientTrackers.get(key);
}

module.exports = {
  formatDuration,
  createVitalTracker,
  tickVitalTracker,
  fullReset,
  getBadgeLabel,
  getPatientTrackerState,
  ESCALATION_MS,
  CONFIRM_READINGS,
};
