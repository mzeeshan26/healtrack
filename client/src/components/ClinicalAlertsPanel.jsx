import PropTypes from 'prop-types';
import { format } from 'date-fns';
import { AlertTriangle, Brain, Clock, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

const EVENT_LABELS = {
  abnormal_started: 'Abnormality detected',
  abnormal_reading: 'Abnormal reading',
  confirmed_warning: 'WARNING confirmed (3 readings)',
  sustained_1min: 'Sustained 1 minute',
  escalated_critical: 'Escalated to CRITICAL (2+ min)',
  normal_streak_reset: '2 normal readings — streak reset',
  smart_reset: '30s normal — tracker cleared',
  cleared: 'Cleared',
};

const ClinicalAlertsPanel = ({ clinicalState, insightHistory }) => {
  if (!clinicalState) return null;

  const { activeAlerts, compositeRules, vitals, evaluatedAt, demoHints } = clinicalState;
  const hasActive = activeAlerts?.length > 0;
  const criticalCount = activeAlerts?.filter((a) => a.severity === 'critical').length || 0;

  return (
    <div className="glass-card border border-white/60 dark:border-white/10 overflow-hidden">
      <div className="p-5 border-b border-white/50 dark:border-white/10 bg-gradient-to-r from-amber-50/80 to-red-50/40 dark:from-amber-900/20 dark:to-red-900/10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-xl text-textPrimary dark:text-white flex items-center gap-2">
            <Brain className="text-primary dark:text-indigo-400" size={22} />
            Clinical Inference Engine
          </h3>
          <p className="text-xs text-textSecondary dark:text-slate-400 mt-1 font-medium">
            Rule-based · 3-reading confirm · 2min escalation · Not diagnostic
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          {criticalCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-red-600 text-white animate-critical-pulse flex items-center gap-1">
              <ShieldAlert size={14} /> {criticalCount} CRITICAL
            </span>
          )}
          <span className="px-3 py-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
            <Clock size={12} className="inline mr-1" />
            {evaluatedAt ? format(new Date(evaluatedAt), 'HH:mm:ss') : '—'}
          </span>
        </div>
      </div>

      {/* Demo timeline legend */}
      {demoHints && (
        <div className="px-5 py-3 bg-slate-50/60 dark:bg-slate-800/40 border-b border-white/40 dark:border-white/5 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-800 dark:text-slate-200">Demo timeline: </span>
          T≈{demoHints.confirmAtSec}s → WARNING ({demoHints.confirmReadings} readings) → T≈
          {demoHints.escalationAtMin}min sustained → CRITICAL
        </div>
      )}

      <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active alerts */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Active signals
          </h4>
          {!hasActive ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold py-4 px-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
              No confirmed clinical alerts. Monitoring with noise filter active.
            </p>
          ) : (
            <ul className="space-y-2">
              {activeAlerts.map((alert) => (
                <li
                  key={`${alert.type}-${alert.id}`}
                  className={clsx(
                    'p-3 rounded-xl border text-sm font-semibold',
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-200 animate-critical-pulse'
                      : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-100'
                  )}
                >
                  <div className="flex justify-between gap-2">
                    <span>{alert.label}</span>
                    <span className="text-[10px] uppercase shrink-0">{alert.severity}</span>
                  </div>
                  {alert.badgeLabel && (
                    <p className="text-xs font-bold mt-1 opacity-90">{alert.badgeLabel}</p>
                  )}
                  {alert.evidence?.length > 0 && (
                    <ul className="mt-2 text-xs font-normal opacity-85 list-disc pl-4 space-y-0.5">
                      {alert.evidence.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          {compositeRules?.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Composite inference</p>
              <div className="flex flex-wrap gap-2">
                {compositeRules.map((r) => (
                  <span
                    key={r.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200 font-bold border border-indigo-200/60 dark:border-indigo-500/30"
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Per-vital timeline */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Vital progression
          </h4>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-1">
            {vitals &&
              Object.entries(vitals)
                .filter(([, v]) => v.phase !== 'normal' || (v.timeline && v.timeline.length > 0))
                .map(([key, v]) => (
                  <div
                    key={key}
                    className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span className="font-bold text-sm dark:text-white">{v.label}</span>
                      <span
                        className={clsx(
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded',
                          v.phase === 'critical' && 'bg-red-600 text-white',
                          v.phase === 'warning' && 'bg-amber-500 text-white',
                          v.phase === 'building' && 'bg-slate-400 text-white',
                          v.phase === 'recovering' && 'bg-emerald-500 text-white'
                        )}
                      >
                        {v.phase}
                      </span>
                    </div>
                    {v.badgeLabel && (
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">{v.badgeLabel}</p>
                    )}
                    <ol className="text-[11px] space-y-1 border-l-2 border-teal-400/50 pl-3 ml-1">
                      {(v.timeline || []).slice(-6).map((ev, i) => (
                        <li key={i} className="text-slate-600 dark:text-slate-400">
                          <span className="font-mono text-teal-600 dark:text-teal-400">
                            {format(new Date(ev.at), 'HH:mm:ss')}
                          </span>{' '}
                          — {EVENT_LABELS[ev.event] || ev.event}
                          {ev.count != null && ` (#${ev.count})`}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
          </div>
        </div>
      </div>

      {insightHistory?.length > 0 && (
        <div className="px-5 pb-5 border-t border-white/40 dark:border-white/5 pt-4">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Recent persisted insights</h4>
          <ul className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar text-xs">
            {insightHistory.slice(0, 8).map((ins) => (
              <li key={ins._id} className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
                <span className="font-semibold truncate">{ins.label}</span>
                <span className="shrink-0 font-mono">{format(new Date(ins.timestamp), 'MMM dd HH:mm')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ClinicalAlertsPanel;

ClinicalAlertsPanel.propTypes = {
  clinicalState: PropTypes.shape({
    activeAlerts: PropTypes.array,
    compositeRules: PropTypes.array,
    vitals: PropTypes.object,
    evaluatedAt: PropTypes.string,
    demoHints: PropTypes.object,
  }),
  insightHistory: PropTypes.array,
};


