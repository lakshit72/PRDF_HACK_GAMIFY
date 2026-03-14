/**
 * pages/Learning.jsx
 *
 * Learning modules grid page.
 * Shows all available modules, completion status, difficulty, and XP reward.
 * Reads localStorage for completed module IDs (synced after quiz submission).
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MODULES } from '../data/modules.js';
import { useUserData } from '../context/UserDataContext.jsx';
import { Skeleton } from '../components/ui/index.jsx';

// ── Module card ───────────────────────────────────────────────────────────────
function ModuleCard({ module, completed, onClick, index }) {
  return (
    <button
      onClick={onClick}
      className="group text-left w-full relative overflow-hidden rounded-2xl border
                 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ink"
      style={{
        background:   `linear-gradient(145deg, #161d2e 0%, #12182a 100%)`,
        borderColor:  completed ? `${module.accent}50` : '#2a3452',
        animationDelay: `${index * 80}ms`,
        focusRingColor: module.accent,
      }}
    >
      {/* Completed glow */}
      {completed && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none rounded-2xl"
          style={{ background: `radial-gradient(ellipse at top left, ${module.accent} 0%, transparent 60%)` }}
        />
      )}

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse at top left, ${module.accent}15 0%, transparent 65%)` }}
      />

      <div className="relative p-5">
        {/* Top row: icon + status */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                       border transition-all duration-300"
            style={{
              background:  `${module.accent}15`,
              borderColor: `${module.accent}30`,
            }}
          >
            {module.icon}
          </div>

          {completed ? (
            <div
              className="flex items-center gap-1.5 text-[10px] font-mono font-bold
                         px-2 py-1 rounded-full border"
              style={{ color: module.accent, borderColor: `${module.accent}40`, background: `${module.accent}10` }}
            >
              ✓ Passed
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-mono text-muted
                            px-2 py-1 rounded-full border border-border bg-surface-2">
              +{module.xp} XP
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-display text-base font-bold mb-1 transition-colors duration-200 group-hover:text-text-primary"
          style={{ color: completed ? module.accent : '#f0f4ff' }}
        >
          {module.title}
        </h3>

        {/* Tagline */}
        <p className="text-text-secondary text-xs font-body leading-relaxed mb-4 line-clamp-2">
          {module.tagline}
        </p>

        {/* Footer meta */}
        <div className="flex items-center gap-3 text-[11px]">
          <span
            className="px-2 py-0.5 rounded-full font-body border"
            style={{
              color: module.accent,
              borderColor: `${module.accent}30`,
              background: `${module.accent}08`,
            }}
          >
            {module.difficulty}
          </span>
          <span className="text-muted font-mono">⏱ {module.duration}</span>
          <span className="text-muted font-mono">{module.quiz.length} Qs</span>
        </div>
      </div>

      {/* Bottom progress bar for completed */}
      {completed && (
        <div
          className="h-1 w-full"
          style={{ background: `linear-gradient(90deg, ${module.accent}, ${module.accentDim})` }}
        />
      )}
    </button>
  );
}

// ── Header stats bar ──────────────────────────────────────────────────────────
function LearningStats({ completed, total, score }) {
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-muted text-xs font-body uppercase tracking-widest mb-0.5">Your Progress</p>
          <p className="font-display text-xl font-bold text-text-primary">
            {completed}/{total} <span className="text-muted text-sm font-body font-normal">modules completed</span>
          </p>
        </div>
        {score && (
          <div className="text-right">
            <p className="text-muted text-[10px] uppercase tracking-wide font-body">NPS Score</p>
            <p className="font-mono font-extrabold text-2xl text-gold">{score.score}</p>
          </div>
        )}
      </div>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #f5c542, #6ee7b7)',
          }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Learning() {
  const navigate                = useNavigate();
  const { score, loading }      = useUserData();

  const [completedIds, setCompletedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fy_completed_modules') ?? '[]'); }
    catch { return []; }
  });

  // Sync completed modules from localStorage on focus (after quiz completion)
  useEffect(() => {
    const sync = () => {
      try {
        setCompletedIds(JSON.parse(localStorage.getItem('fy_completed_modules') ?? '[]'));
      } catch {}
    };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  const completedCount = MODULES.filter((m) => completedIds.includes(m.id)).length;

  return (
    <div className="min-h-dvh">
      {/* Ambient background */}
      <div
        className="fixed inset-x-0 top-0 h-80 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% -10%, rgba(125,211,252,0.07) 0%, transparent 60%),' +
            'radial-gradient(ellipse 50% 40% at 80% 30%, rgba(110,231,183,0.05) 0%, transparent 55%)',
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 pt-10 pb-28">

        {/* ── Nav back ── */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-text-secondary text-sm font-body mb-8
                     hover:text-text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Dashboard
        </button>

        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl">📚</span>
            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight leading-none">
              Learn NPS
            </h1>
          </div>
          <p className="text-text-secondary text-sm font-body">
            Master each module, ace the quiz, and watch your NPS Readiness Score climb.
          </p>
        </div>

        {/* ── Stats bar ── */}
        {loading ? (
          <Skeleton className="h-24 rounded-2xl mb-6" />
        ) : (
          <LearningStats completed={completedCount} total={MODULES.length} score={score} />
        )}

        {/* ── Module grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
          {MODULES.map((mod, i) => (
            <div key={mod.id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <ModuleCard
                module={mod}
                completed={completedIds.includes(mod.id)}
                onClick={() => navigate(`/learn/${mod.id}`)}
                index={i}
              />
            </div>
          ))}
        </div>

        {/* ── Hint ── */}
        <p className="text-center text-muted text-xs font-body mt-8">
          Complete all modules to max out your Knowledge score component
        </p>

      </div>
    </div>
  );
}