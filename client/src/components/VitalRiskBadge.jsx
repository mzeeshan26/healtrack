import PropTypes from 'prop-types';
import clsx from 'clsx';

/**
 * Noise-filtered risk badge: building → WARNING (~6s) → CRITICAL (2min+).
 */
const VitalRiskBadge = ({ vitalState }) => {
  if (!vitalState || vitalState.phase === 'normal') return null;

  const { phase, severity, badgeLabel, confirmProgress } = vitalState;
  const isCritical = phase === 'critical' || severity === 'critical';
  const isBuilding = phase === 'building';
  const isRecovering = phase === 'recovering';

  return (
    <div
      className={clsx(
        'mt-3 inline-flex flex-col gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border',
        isCritical &&
          'bg-red-600/90 text-white border-red-700 animate-critical-pulse shadow-lg shadow-red-500/40',
        !isCritical &&
          phase === 'warning' &&
          'bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/50',
        isBuilding &&
          'bg-slate-200/80 text-slate-700 border-slate-300 dark:bg-slate-700/80 dark:text-slate-200 dark:border-slate-500',
        isRecovering &&
          'bg-emerald-100/90 text-emerald-800 border-emerald-400 dark:bg-emerald-500/15 dark:text-emerald-300'
      )}
    >
      {isBuilding ? (
        <>
          <span>Confirming… {confirmProgress}</span>
          <span className="normal-case font-semibold opacity-80">Need 3 readings (~6 sec)</span>
        </>
      ) : (
        <span className="flex items-center gap-1.5">
          {isCritical && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          {badgeLabel || (isRecovering ? 'RECOVERING' : severity?.toUpperCase())}
        </span>
      )}
    </div>
  );
};

export default VitalRiskBadge;

VitalRiskBadge.propTypes = {
  vitalState: PropTypes.shape({
    phase: PropTypes.string,
    severity: PropTypes.string,
    badgeLabel: PropTypes.string,
    confirmProgress: PropTypes.string,
    durationLabel: PropTypes.string,
  }),
};

