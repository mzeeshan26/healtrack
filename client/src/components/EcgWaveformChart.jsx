import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { format } from 'date-fns';

export const ECG_BUFFER_SIZE = 300;

export function prepareEcgSeries(buffer) {
  if (!buffer?.length) return [];
  const mean = buffer.reduce((sum, p) => sum + p.value, 0) / buffer.length;
  return buffer.map((p, i) => ({
    sample: i,
    value: p.value - mean,
    raw: p.value,
    timestamp: p.timestamp,
  }));
}

export function appendEcgSample(prev, ecgRaw, timestamp, maxSize = ECG_BUFFER_SIZE) {
  const next = [
    ...prev,
    { value: Number(ecgRaw) || 0, timestamp: timestamp || new Date().toISOString() },
  ];
  return next.slice(-maxSize);
}

export function ecgBufferFromHistory(history, maxSize = ECG_BUFFER_SIZE) {
  const ordered = [...(history || [])].reverse();
  return ordered.slice(-maxSize).map((h) => ({
    value: Number(h.ecgRaw) || 0,
    timestamp: h.timestamp,
  }));
}

function EcgTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-[#0b1219]/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
      <p className="font-mono text-emerald-400/80">
        {point.timestamp ? format(new Date(point.timestamp), 'HH:mm:ss.SSS') : '—'}
      </p>
      <p className="mt-1 font-bold text-emerald-300">ADC: {point.raw}</p>
    </div>
  );
}

export default function EcgWaveformChart({ data, ecgStatus, height = 360, className = '' }) {
  const series = prepareEcgSeries(data);
  const isAbnormal = ecgStatus === 'abnormal';
  const strokeColor = isAbnormal ? '#f87171' : '#34d399';
  const glowColor = isAbnormal ? 'rgba(248,113,113,0.5)' : 'rgba(52,211,153,0.5)';

  const yValues = series.map((p) => p.value);
  const yMin = yValues.length ? Math.min(...yValues) : -100;
  const yMax = yValues.length ? Math.max(...yValues) : 100;
  const yPad = Math.max((yMax - yMin) * 0.15, 20);

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${isAbnormal ? 'border-red-500/40' : 'border-emerald-500/25'} bg-[#070d12] ${className}`}
      style={{ minHeight: height }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(52,211,153,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.2) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${isAbnormal ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
          {isAbnormal ? 'Abnormal rhythm' : 'Sinus rhythm'}
        </span>
        <span className="font-mono text-[10px] text-emerald-400/60">{series.length} samples</span>
      </div>
      {series.length < 2 ? (
        <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-emerald-400/50">
          Waiting for ECG samples from device…
        </div>
      ) : (
        <div className="relative z-[1] pt-10" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <XAxis dataKey="sample" hide />
              <YAxis domain={[yMin - yPad, yMax + yPad]} hide />
              <Tooltip content={<EcgTooltip />} cursor={{ stroke: strokeColor, strokeOpacity: 0.35 }} />
              <Line
                type="linear"
                dataKey="value"
                stroke={strokeColor}
                strokeWidth={1.75}
                dot={false}
                isAnimationActive={false}
                style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div
        className="pointer-events-none absolute left-0 right-0 top-1/2 z-[1] h-px -translate-y-1/2"
        style={{ background: `linear-gradient(90deg, transparent, ${strokeColor}55, transparent)` }}
      />
    </div>
  );
}

EcgWaveformChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.number,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ),
  ecgStatus: PropTypes.string,
  height: PropTypes.number,
  className: PropTypes.string,
};
