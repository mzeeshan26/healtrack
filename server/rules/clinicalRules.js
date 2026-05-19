const features = require('./features');
const { isEcgAbnormal } = require('../services/vitalChecks');

const DISCLAIMER = 'Clinical inference only — not a diagnosis.';

/**
 * Composite rule-based clinical inference.
 * Each rule returns { id, label, met, evidence, severityHint }.
 */
function evaluateCompositeRules(vitals, thresholds, history, vitalTrackers) {
  const t = thresholds;
  const h = history || [];
  const hrWarn =
    vitalTrackers.heartRate?.phase === 'warning' ||
    vitalTrackers.heartRate?.phase === 'critical';
  const spo2Warn =
    vitalTrackers.spo2?.phase === 'warning' || vitalTrackers.spo2?.phase === 'critical';
  const tempWarn =
    vitalTrackers.temperature?.phase === 'warning' ||
    vitalTrackers.temperature?.phase === 'critical';
  const ecgWarn =
    vitalTrackers.ecgStatus?.phase === 'warning' ||
    vitalTrackers.ecgStatus?.phase === 'critical';

  const hrHigh = vitals.heartRate > t.heartRate.max;
  const hrLow = vitals.heartRate < t.heartRate.min;
  const spo2Low = vitals.spo2 < t.spo2.min;
  const tempHigh = vitals.temperature > t.temperature.max;
  const tempRising = features.isRising(h, 'temperature', 0.2);
  const hrRising = features.isRising(h, 'heartRate', 3);
  const ecgAbn = isEcgAbnormal(vitals.ecgStatus, t);

  const rules = [];

  // —— Single-condition clinical labels (when confirmed by tracker) ——
  if (hrWarn && hrHigh) {
    rules.push({
      id: 'tachycardia',
      label: 'Tachycardia',
      met: true,
      severityHint: vitalTrackers.heartRate.severity,
      evidence: [`HR ${vitals.heartRate} BPM > max ${t.heartRate.max}`, '3-reading confirmation passed'],
    });
  }
  if (hrWarn && hrLow) {
    rules.push({
      id: 'bradycardia',
      label: 'Bradycardia',
      met: true,
      severityHint: vitalTrackers.heartRate.severity,
      evidence: [`HR ${vitals.heartRate} BPM < min ${t.heartRate.min}`, '3-reading confirmation passed'],
    });
  }
  if (spo2Warn && spo2Low) {
    rules.push({
      id: 'hypoxemia',
      label: 'Hypoxemia',
      met: true,
      severityHint: vitalTrackers.spo2.severity,
      evidence: [`SpO₂ ${vitals.spo2}% < min ${t.spo2.min}%`, '3-reading confirmation passed'],
    });
  }
  if (tempWarn && tempHigh) {
    const feverLevel =
      vitals.temperature >= 39
        ? 'High fever'
        : vitals.temperature >= 38
          ? 'Moderate fever'
          : 'Mild fever';
    rules.push({
      id: 'fever',
      label: `Fever — ${feverLevel}`,
      met: true,
      severityHint: vitalTrackers.temperature.severity,
      evidence: [`Temp ${vitals.temperature}°C > max ${t.temperature.max}°C`, feverLevel],
    });
  }

  // —— Composite inference ——
  const sepsisMet =
    (tempWarn || tempHigh || tempRising) && (hrWarn || hrHigh || hrRising) && (spo2Warn || spo2Low);
  rules.push({
    id: 'sepsis_risk',
    label: 'Sepsis risk indicator',
    met: sepsisMet,
    severityHint: sepsisMet ? maxSeverity(vitalTrackers.temperature, vitalTrackers.heartRate, vitalTrackers.spo2) : null,
    evidence: sepsisMet
      ? ['Temp ↑ or elevated', 'HR ↑ or elevated', 'SpO₂ ↓ — combined pattern']
      : [],
  });

  const cardiacMet = (hrWarn || hrHigh) && (ecgWarn || ecgAbn);
  rules.push({
    id: 'cardiac_stress',
    label: 'Cardiac stress',
    met: cardiacMet,
    severityHint: cardiacMet ? maxSeverity(vitalTrackers.heartRate, vitalTrackers.ecgStatus) : null,
    evidence: cardiacMet ? ['HR elevated', 'ECG abnormal'] : [],
  });

  const respiratoryMet = (spo2Warn || spo2Low) && (hrWarn || hrHigh);
  rules.push({
    id: 'respiratory_distress',
    label: 'Respiratory distress indicator',
    met: respiratoryMet,
    severityHint: respiratoryMet ? maxSeverity(vitalTrackers.spo2, vitalTrackers.heartRate) : null,
    evidence: respiratoryMet ? ['SpO₂ low', 'HR elevated — compensatory pattern'] : [],
  });

  const covidFlagMet =
    (spo2Warn || features.isSpo2Low(h, t.spo2.min)) && (tempWarn || tempHigh);
  rules.push({
    id: 'respiratory_risk_flag',
    label: 'Respiratory risk flag (non-diagnostic)',
    met: covidFlagMet,
    severityHint: covidFlagMet ? 'warning' : null,
    evidence: covidFlagMet
      ? ['Sustained low SpO₂ with elevated temperature', DISCLAIMER]
      : [],
  });

  if (features.stressIndication(h, t) && hrWarn) {
    rules.push({
      id: 'stress_indication',
      label: 'Stress indication (HR trend)',
      met: true,
      severityHint: 'warning',
      evidence: ['HR trending up without fever trend', 'Basic trend analysis'],
    });
  }

  if (features.elevatedHrVariability(h)) {
    rules.push({
      id: 'hr_variability',
      label: 'Elevated HR variability (basic)',
      met: true,
      severityHint: 'warning',
      evidence: ['HR std dev elevated over recent window'],
    });
  }

  const infectionMet = tempRising && hrRising;
  rules.push({
    id: 'infection_trend',
    label: 'Infection trend',
    met: infectionMet,
    severityHint: infectionMet ? 'warning' : null,
    evidence: infectionMet ? ['Temperature trending up', 'Heart rate trending up'] : [],
  });

  return rules.filter((r) => r.met).map((r) => ({ ...r, disclaimer: DISCLAIMER }));
}

function maxSeverity(...trackers) {
  const order = { normal: 0, warning: 1, critical: 2 };
  let best = 'warning';
  for (const tr of trackers) {
    if (!tr?.severity) continue;
    if (order[tr.severity] > order[best]) best = tr.severity;
  }
  return best;
}

module.exports = { evaluateCompositeRules, DISCLAIMER };
