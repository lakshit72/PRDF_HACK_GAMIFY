/**
 * components/futureself/FutureSelfAvatar.jsx
 * Stylised SVG illustration of a 60-year-old, with the user's initial overlaid.
 * Animates in on mount. Includes ambient particle effects.
 */

export default function FutureSelfAvatar({ initial = '?', tier = 'Good' }) {
  // Colour theme by NPS tier
  const palette = {
    Excellent: { ring: '#6ee7b7', glow: '#6ee7b710', robe: '#1a3a2f', accent: '#34d399' },
    Good:      { ring: '#f5c542', glow: '#f5c54210', robe: '#2d2510', accent: '#f59e0b' },
    Fair:      { ring: '#ff6b35', glow: '#ff6b3510', robe: '#2d1a10', accent: '#f97316' },
    'Needs Work': { ring: '#7dd3fc', glow: '#7dd3fc10', robe: '#0f2030', accent: '#38bdf8' },
  };
  const p = palette[tier] ?? palette['Good'];

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      <div
        className="absolute w-52 h-52 rounded-full animate-pulse-slow"
        style={{ background: `radial-gradient(circle, ${p.ring}18 0%, transparent 70%)` }}
      />

      <svg
        width="200" height="220"
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 animate-fade-in drop-shadow-2xl"
        style={{ animationDuration: '0.8s' }}
      >
        {/* Background circle */}
        <circle cx="100" cy="100" r="90" fill="#161d2e" stroke={p.ring} strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Subtle inner glow */}
        <circle cx="100" cy="100" r="80" fill={p.glow} />

        {/* Robe / body */}
        <ellipse cx="100" cy="175" rx="52" ry="38" fill={p.robe} />
        <path d="M 55 185 Q 100 155 145 185" fill={p.robe} />

        {/* Neck */}
        <rect x="90" y="128" width="20" height="22" rx="8" fill="#c8a882" />

        {/* Head */}
        <ellipse cx="100" cy="115" rx="30" ry="34" fill="#c8a882" />

        {/* Hair (silvery, older) */}
        <ellipse cx="100" cy="88" rx="30" ry="14" fill="#9ca3af" />
        <path d="M 71 95 Q 68 115 72 128" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M 129 95 Q 132 115 128 128" stroke="#9ca3af" strokeWidth="6" strokeLinecap="round" fill="none" />

        {/* Eyes — slightly wisdom-squinting */}
        <path d="M 87 113 Q 91 110 95 113" stroke="#374151" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M 105 113 Q 109 110 113 113" stroke="#374151" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Smile wrinkles */}
        <path d="M 83 122 Q 100 130 117 122" stroke="#a87c5a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M 83 122 Q 80 118 83 115" stroke="#a87c5a" strokeWidth="1" fill="none" />
        <path d="M 117 122 Q 120 118 117 115" stroke="#a87c5a" strokeWidth="1" fill="none" />

        {/* Wisdom lines on forehead */}
        <path d="M 88 103 Q 100 100 112 103" stroke="#a87c5a" strokeWidth="0.8" fill="none" opacity="0.6" />
        <path d="M 91 97 Q 100 95 109 97" stroke="#a87c5a" strokeWidth="0.8" fill="none" opacity="0.4" />

        {/* Initial badge */}
        <circle cx="100" cy="192" r="18" fill={p.ring} opacity="0.15" stroke={p.ring} strokeWidth="1" />
        <text
          x="100" y="197"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fontFamily="Syne, sans-serif"
          fill={p.accent}
        >
          {initial}
        </text>

        {/* Stars / sparkles around head */}
        {[
          [62, 72, 5], [138, 68, 4], [55, 105, 3], [145, 100, 3.5], [100, 52, 4],
        ].map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={p.accent} opacity="0.6" />
            <circle cx={cx} cy={cy} r={r * 1.8} fill={p.accent} opacity="0.1" />
          </g>
        ))}
      </svg>

      {/* Age badge */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2
                   px-3 py-1 rounded-full text-xs font-mono font-bold border"
        style={{ background: '#0b0f1a', borderColor: p.ring, color: p.accent }}
      >
        Age 60 · You
      </div>
    </div>
  );
}