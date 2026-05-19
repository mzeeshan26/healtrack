/** Format ms as "1min 45sec" for risk badges */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0sec';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}min ${sec}sec`;
  return `${sec}sec`;
}

const ESCALATION_MS = 120_000;

/** Client-side live duration between socket packets */
export function buildLiveBadgeLabel(vitalState, extraMs = 0) {
  if (!vitalState || vitalState.phase === 'normal' || vitalState.phase === 'building') {
    return vitalState?.badgeLabel ?? null;
  }
  const durationMs = (vitalState.durationMs || 0) + extraMs;
  const dur = formatDuration(durationMs);
  const level = vitalState.severity === 'critical' ? 'CRITICAL' : 'WARNING';
  if (vitalState.phase === 'recovering') return `RECOVERING (${dur})`;
  if (durationMs >= ESCALATION_MS && vitalState.severity === 'critical') {
    return `CRITICAL (${dur})`;
  }
  if (durationMs >= 60_000 && vitalState.severity === 'warning') {
    return `WARNING — sustained ${dur}`;
  }
  return `${level} (${dur})`;
}

export function enrichClinicalState(state, clockMs) {
  if (!state?.evaluatedAt) return state;
  const evaluated = new Date(state.evaluatedAt).getTime();
  const extra = Math.max(0, clockMs - evaluated);
  const vitals = {};
  for (const [key, v] of Object.entries(state.vitals || {})) {
    let phase = v.phase;
    let severity = v.severity;
    const durationMs =
      (v.durationMs || 0) + (['warning', 'critical'].includes(v.phase) ? extra : 0);
    if (phase === 'warning' && durationMs >= ESCALATION_MS) {
      phase = 'critical';
      severity = 'critical';
    }
    const liveLabel =
      phase === 'warning' || phase === 'critical'
        ? buildLiveBadgeLabel({ ...v, phase, severity, durationMs }, 0)
        : v.badgeLabel;
    vitals[key] = {
      ...v,
      phase,
      severity,
      badgeLabel: liveLabel,
      durationMs,
    };
  }
  return { ...state, vitals };
}
