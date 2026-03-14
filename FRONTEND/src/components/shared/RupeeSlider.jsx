/**
 * components/shared/RupeeSlider.jsx
 * Styled range slider that displays ₹ values.
 * Props: label, value, min, max, step, onChange, formatValue, sublabel
 */

const defaultFormat = (v) => {
  if (v >= 1_00_000)  return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1_000)     return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
};

export default function RupeeSlider({
  label,
  value,
  min = 0,
  max = 10000,
  step = 100,
  onChange,
  formatValue = defaultFormat,
  sublabel,
  accentColor = '#f5c542',
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-text-secondary font-body uppercase tracking-wide">
          {label}
        </label>
        <span
          className="font-mono font-bold text-base tabular-nums px-2 py-0.5 rounded-lg"
          style={{ color: accentColor, background: `${accentColor}15` }}
        >
          {formatValue(value)}
        </span>
      </div>

      {/* Slider track */}
      <div className="relative h-6 flex items-center">
        {/* Filled track */}
        <div className="absolute left-0 h-2 rounded-full pointer-events-none z-10"
          style={{ width: `${pct}%`, background: accentColor, opacity: 0.9 }} />
        {/* Empty track */}
        <div className="absolute left-0 right-0 h-2 rounded-full bg-surface-2 border border-border" />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full z-20 appearance-none bg-transparent cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5
                     [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:border-ink
                     [&::-webkit-slider-thumb]:shadow-lg
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:w-5
                     [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:border-ink
                     [&::-moz-range-thumb]:cursor-pointer"
          style={{
            '--thumb-color': accentColor,
            // Dynamically set thumb color via inline style for cross-browser
          }}
        />
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between">
        <span className="text-[10px] text-muted font-mono">{formatValue(min)}</span>
        {sublabel && <span className="text-[10px] text-muted font-body italic">{sublabel}</span>}
        <span className="text-[10px] text-muted font-mono">{formatValue(max)}</span>
      </div>

      {/* Thumb color override via style tag trick */}
      <style>{`
        input[type=range]::-webkit-slider-thumb { background: ${accentColor}; }
        input[type=range]::-moz-range-thumb { background: ${accentColor}; border-color: #0b0f1a; }
      `}</style>
    </div>
  );
}