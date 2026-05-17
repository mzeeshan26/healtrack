import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';

export const ECG_CHART_MAX_POINTS = 300;
/** Points drawn on screen (subset of buffer = horizontal zoom on recent strip) */
const ECG_DISPLAY_POINTS = 200;
const ECG_ADC_MIN = 0;
const ECG_ADC_MAX = 1023;
const NEON_GREEN = '#22C55E';
/** Minimum Y window (ADC counts) — higher = more zoomed out vertically */
const MIN_Y_SPAN = 90;
const Y_PAD_RATIO = 0.22;

/** Auto-zoom Y axis to visible waveform (not full 0–1023) */
export function computeZoomedYDomain(values) {
  if (!values?.length) return [ECG_ADC_MIN, ECG_ADC_MAX];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const center = (min + max) / 2;
  const halfSpan = (Math.max(span, MIN_Y_SPAN) / 2) * (1 + Y_PAD_RATIO);

  let yMin = Math.floor(center - halfSpan);
  let yMax = Math.ceil(center + halfSpan);

  if (yMax - yMin < MIN_Y_SPAN) {
    const mid = (yMin + yMax) / 2;
    yMin = Math.floor(mid - MIN_Y_SPAN / 2);
    yMax = Math.ceil(mid + MIN_Y_SPAN / 2);
  }

  yMin = Math.max(ECG_ADC_MIN, yMin);
  yMax = Math.min(ECG_ADC_MAX, yMax);

  if (yMax - yMin < MIN_Y_SPAN) {
    if (yMin === ECG_ADC_MIN) yMax = Math.min(ECG_ADC_MAX, yMin + MIN_Y_SPAN);
    else if (yMax === ECG_ADC_MAX) yMin = Math.max(ECG_ADC_MIN, yMax - MIN_Y_SPAN);
  }

  return [yMin, yMax];
}

/** Append one or many ADC samples; re-index sample numbers for scrolling window */
export function appendEcgSamples(prev, samples, batchTimestamp, maxSize = ECG_CHART_MAX_POINTS) {
  const values = Array.isArray(samples) ? samples : [samples];
  if (!values.length) return prev;

  const ts = batchTimestamp || new Date().toISOString();
  const startIndex = prev.length;
  const incoming = values.map((v, i) => ({
    sample: startIndex + i,
    value: Number(v) || 0,
    timestamp: ts,
  }));

  const merged = [...prev, ...incoming].slice(-maxSize);
  return merged.map((p, i) => ({ ...p, sample: i }));
}

/** Seed chart from latest vitals (ecgBuffer array or single ecgRaw) */
export function ecgPointsFromVitals(vitals, maxSize = ECG_CHART_MAX_POINTS) {
  if (!vitals) return [];
  if (Array.isArray(vitals.ecgBuffer) && vitals.ecgBuffer.length > 0) {
    return appendEcgSamples([], vitals.ecgBuffer, vitals.timestamp, maxSize);
  }
  if (vitals.ecgRaw != null) {
    return appendEcgSamples([], [vitals.ecgRaw], vitals.timestamp, maxSize);
  }
  return [];
}

function EcgTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-[#22C55E]/40 bg-[#0a0f14]/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="font-mono text-[#22C55E]/80">Sample #{point.sample}</p>
      <p className="mt-1 font-bold text-[#22C55E]">ADC: {point.value}</p>
      {point.timestamp && (
        <p className="mt-0.5 font-mono text-[10px] text-[#22C55E]/50">
          {format(new Date(point.timestamp), 'HH:mm:ss')}
        </p>
      )}
    </div>
  );
}

EcgTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.arrayOf(
    PropTypes.shape({
      payload: PropTypes.shape({
        sample: PropTypes.number,
        value: PropTypes.number,
        timestamp: PropTypes.string,
      }),
    })
  ),
};

export default function EcgWaveformChart({ data, ecgStatus, height = 380, className = '' }) {
  const buffer = data ?? [];
  const series =
    buffer.length > ECG_DISPLAY_POINTS
      ? buffer.slice(-ECG_DISPLAY_POINTS).map((p, i) => ({ ...p, sample: i }))
      : buffer;
  const isAbnormal = ecgStatus === 'abnormal';
  const strokeColor = isAbnormal ? '#f87171' : NEON_GREEN;
  const glowColor = isAbnormal ? 'rgba(248,113,113,0.55)' : 'rgba(34,197,94,0.55)';
  const yValues = series.map((p) => p.value);
  const [yMin, yMax] = computeZoomedYDomain(yValues);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${isAbnormal ? 'border-red-500/40' : 'border-[#22C55E]/30'} bg-[#0a0f14] ${className}`}
      style={{ minHeight: height }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,197,94,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.25) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            isAbnormal ? 'bg-red-500/20 text-red-300' : 'bg-[#22C55E]/20 text-[#22C55E]'
          }`}
        >
          {isAbnormal ? 'Abnormal rhythm' : 'Sinus rhythm'}
        </span>
        <span className="font-mono text-[10px] text-[#22C55E]/60">
          {series.length} shown · {buffer.length} buffered
        </span>
        <span className="font-mono text-[10px] text-[#22C55E]/40">10 Hz · 20 pts / 2s</span>
        {series.length >= 2 && (
          <span className="font-mono text-[10px] text-[#22C55E]/50">
            Zoom {yMin}–{yMax}
          </span>
        )}
      </div>
      {series.length < 2 ? (
        <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-[#22C55E]/50">
          Waiting for ECG samples from device…
        </div>
      ) : (
        <div className="relative z-[1] pt-10" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#22C55E" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="sample" stroke="#22C55E" strokeOpacity={0.35} fontSize={10} tickCount={6} axisLine={false} tickLine={false} />
              <YAxis
                domain={[yMin, yMax]}
                allowDataOverflow
                stroke="#22C55E"
                strokeOpacity={0.35}
                fontSize={10}
                width={44}
                tickCount={6}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<EcgTooltip />} cursor={{ stroke: strokeColor, strokeOpacity: 0.4 }} />
              <Line
                type="linear"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={280}
                animationEasing="ease-out"
                style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

EcgWaveformChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      sample: PropTypes.number,
      value: PropTypes.number,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ),
  ecgStatus: PropTypes.string,
  height: PropTypes.number,
  className: PropTypes.string,
};
