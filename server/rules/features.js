/**
 * Trend features from vitals history (no ML).
 */

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/** Positive = rising over window (oldest → newest) */
function trendDelta(readings, field) {
  if (readings.length < 2) return 0;
  const sorted = [...readings].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const first = sorted[0][field];
  const last = sorted[sorted.length - 1][field];
  if (first == null || last == null) return 0;
  return last - first;
}

function isRising(readings, field, minDelta = 0.15) {
  return trendDelta(readings, field) >= minDelta;
}

function isHrElevated(readings, maxHr) {
  const recent = readings.slice(0, 5);
  return recent.filter((r) => r.heartRate > maxHr).length >= 2;
}

function isSpo2Low(readings, minSpo2) {
  const recent = readings.slice(0, 5);
  return recent.filter((r) => r.spo2 < minSpo2).length >= 2;
}

function isTempElevated(readings, maxTemp) {
  const recent = readings.slice(0, 5);
  return recent.filter((r) => r.temperature > maxTemp).length >= 2;
}

/** Basic stress: HR rising without fever trend */
function stressIndication(readings, thresholds) {
  if (readings.length < 5) return false;
  const hrRising = isRising(readings, 'heartRate', 3);
  const tempRising = isRising(readings, 'temperature', 0.2);
  const hrHigh = isHrElevated(readings, thresholds.heartRate.max);
  return hrRising && hrHigh && !tempRising;
}

/** Basic HRV proxy: elevated HR variability */
function elevatedHrVariability(readings) {
  const hrs = readings.map((r) => r.heartRate).filter((v) => v != null);
  return hrs.length >= 8 && stdDev(hrs) > 8;
}

module.exports = {
  mean,
  stdDev,
  trendDelta,
  isRising,
  isHrElevated,
  isSpo2Low,
  isTempElevated,
  stressIndication,
  elevatedHrVariability,
};
