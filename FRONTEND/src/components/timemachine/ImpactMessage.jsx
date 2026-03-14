/**
 * components/timemachine/ImpactMessage.jsx
 * Contextual fun message based on the extra corpus amount.
 */

const MESSAGES = [
  { min: 5_000_000,  emoji: '🏰', msg: "That's enough to buy a small villa by the beach!" },
  { min: 2_000_000,  emoji: '🌍', msg: "That's enough for a round-the-world trip — multiple times!" },
  { min: 1_000_000,  emoji: '✈️',  msg: "That's a dream international vacation with the whole family!" },
  { min: 500_000,    emoji: '🏖️', msg: "That's enough for a luxury Maldives getaway!" },
  { min: 200_000,    emoji: '🎉', msg: "That's a fantastic family celebration or home upgrade!" },
  { min: 100_000,    emoji: '📱', msg: "That's the latest flagship phone — every single year for a decade!" },
  { min: 50_000,     emoji: '🍽️', msg: "That's 500 premium restaurant dinners you didn't skip!" },
  { min: 10_000,     emoji: '☕', msg: "That's a lot of coffee — invested, not consumed!" },
  { min: 0,          emoji: '🌱', msg: "Every rupee redirected is a seed planted for the future." },
];

const formatINR = (v) => {
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
};

export default function ImpactMessage({ extraCorpus, saving, message }) {
  const found = MESSAGES.find((m) => extraCorpus >= m.min) ?? MESSAGES[MESSAGES.length - 1];

  return (
    <div
      className="rounded-2xl p-5 border border-sage/20 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a1f14 0%, #0f2015 100%)' }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-radial from-sage/8 to-transparent pointer-events-none" />

      <div className="relative">
        {/* Emoji + headline */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-4xl">{found.emoji}</span>
          <div>
            <p className="text-sage font-display font-bold text-base leading-snug">
              {found.msg}
            </p>
          </div>
        </div>

        {/* API message */}
        {message && (
          <p className="text-sage/70 text-sm font-body italic leading-relaxed mb-4">
            "{message}"
          </p>
        )}

        {/* Stats row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-black/20 rounded-xl p-3 text-center">
            <p className="text-sage/50 text-[10px] uppercase tracking-wide font-body mb-1">You redirect</p>
            <p className="text-sage font-mono font-bold text-base">{formatINR(saving)}/mo</p>
          </div>
          <div className="flex-1 bg-black/20 rounded-xl p-3 text-center">
            <p className="text-sage/50 text-[10px] uppercase tracking-wide font-body mb-1">Extra at 60</p>
            <p className="text-sage font-mono font-bold text-base">+{formatINR(extraCorpus)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}