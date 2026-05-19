/**
 * Rule-based clinical inference — timing & noise-filter constants.
 * Assumes ~2s between MQTT vitals packets → 3 readings ≈ 6 seconds.
 */
module.exports = {
  /** Consecutive abnormal readings required before WARNING fires */
  CONFIRM_READINGS: 3,

  /** Consecutive normal readings to reset abnormal streak (noise filter) */
  NORMAL_RESET_READINGS: 2,

  /** Continuous normal period before full tracker clear (ms) */
  SMART_RESET_MS: 30_000,

  /** Sustained abnormality before WARNING → CRITICAL (ms) */
  ESCALATION_MS: 120_000,

  /** Vitals history window for trend / composite rules */
  HISTORY_WINDOW: 15,

  /** Cooldown before re-emitting the same composite insight to DB/socket (ms) */
  INSIGHT_COOLDOWN_MS: 5 * 60_000,
};
