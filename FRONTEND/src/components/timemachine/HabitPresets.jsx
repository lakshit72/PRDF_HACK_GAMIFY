/**
 * components/timemachine/HabitPresets.jsx
 * Tappable pill-buttons for common spending habits.
 */

export const PRESETS = [
  { id: 'coffee',    label: '☕ Coffee',        current: 500,  reduced: 100, color: '#c2855a' },
  { id: 'food',      label: '🍕 Eating Out',    current: 3000, reduced: 800, color: '#f97316' },
  { id: 'streaming', label: '📺 Streaming',     current: 800,  reduced: 200, color: '#7dd3fc' },
  { id: 'shopping',  label: '🛍️ Impulse Buys', current: 5000, reduced: 1000, color: '#a78bfa' },
  { id: 'taxi',      label: '🚕 Cab Rides',     current: 2000, reduced: 600, color: '#fb923c' },
  { id: 'gym',       label: '💪 Unused Gym',    current: 2500, reduced: 0,   color: '#6ee7b7' },
];

export default function HabitPresets({ activeId, onSelect }) {
  return (
    <div>
      <p className="text-xs text-muted font-body uppercase tracking-wide mb-3">
        Quick Presets
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-body border transition-all duration-200
              ${activeId === p.id
                ? 'border-gold/60 bg-gold/10 text-gold'
                : 'border-border bg-surface-2 text-text-secondary hover:border-border/80 hover:text-text-primary'
              }
            `}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}