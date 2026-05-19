/**
 * Per-vital threshold checks (single-reading abnormality).
 */

function isHeartRateAbnormal(hr, t) {
  if (hr == null) return false;
  return hr < t.heartRate.min || hr > t.heartRate.max;
}

function isSpo2Abnormal(spo2, t) {
  if (spo2 == null) return false;
  return spo2 < t.spo2.min;
}

function isTemperatureAbnormal(temp, t) {
  if (temp == null) return false;
  return temp < t.temperature.min || temp > t.temperature.max;
}

function isEcgAbnormal(ecgStatus, t) {
  const expected = t.ecgStatus?.normalValue || 'normal';
  return ecgStatus != null && ecgStatus !== expected;
}

function isRoomTempAbnormal(val, t) {
  if (val == null || !t.roomTemperature) return false;
  return val < t.roomTemperature.min || val > t.roomTemperature.max;
}

function isHumidityAbnormal(val, t) {
  if (val == null || !t.humidity) return false;
  return val < t.humidity.min || val > t.humidity.max;
}

/** Map of vital key → { check, label, direction hint for UI } */
const VITAL_DEFINITIONS = {
  heartRate: {
    label: 'Heart Rate',
    check: (v, t) => isHeartRateAbnormal(v.heartRate, t),
    detail: (v, t) => {
      if (v.heartRate < t.heartRate.min) return 'Bradycardia';
      if (v.heartRate > t.heartRate.max) return 'Tachycardia';
      return null;
    },
  },
  spo2: {
    label: 'SpO₂',
    check: (v, t) => isSpo2Abnormal(v.spo2, t),
    detail: () => 'Hypoxemia',
  },
  temperature: {
    label: 'Body Temperature',
    check: (v, t) => isTemperatureAbnormal(v.temperature, t),
    detail: (v, t) => {
      if (v.temperature > t.temperature.max) return 'Fever / hyperthermia';
      if (v.temperature < t.temperature.min) return 'Hypothermia';
      return null;
    },
  },
  ecgStatus: {
    label: 'ECG',
    check: (v, t) => isEcgAbnormal(v.ecgStatus, t),
    detail: () => 'Abnormal ECG pattern',
  },
  roomTemperature: {
    label: 'Ambient Temperature',
    check: (v, t) => isRoomTempAbnormal(v.roomTemperature ?? 22, t),
    detail: () => 'Ambient temp out of range',
  },
  humidity: {
    label: 'Humidity',
    check: (v, t) => isHumidityAbnormal(v.humidity ?? 45, t),
    detail: () => 'Humidity out of range',
  },
};

function getVitalAbnormalities(vitals, thresholds) {
  const result = {};
  for (const [key, def] of Object.entries(VITAL_DEFINITIONS)) {
    const abnormal = def.check(vitals, thresholds);
    result[key] = {
      abnormal,
      label: def.label,
      detail: abnormal ? def.detail(vitals, thresholds) : null,
    };
  }
  return result;
}

module.exports = {
  VITAL_DEFINITIONS,
  getVitalAbnormalities,
  isHeartRateAbnormal,
  isSpo2Abnormal,
  isTemperatureAbnormal,
  isEcgAbnormal,
};
