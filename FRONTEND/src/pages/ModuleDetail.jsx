/**
 * pages/ModuleDetail.jsx
 *
 * Shows full module content (sections with headings/body text),
 * then offers a "Take Quiz" button that launches the Quiz component inline.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getModuleById } from '../data/modules.js';
import Quiz from '../components/quiz/Quiz.jsx';

// ── Section renderer ──────────────────────────────────────────────────────────
function Section({ section, index, accent }) {
  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex gap-4">
        {/* Left accent stripe */}
        <div
          className="w-0.5 rounded-full shrink-0 mt-1"
          style={{ background: `linear-gradient(to bottom, ${accent}, transparent)`, minHeight: '100%' }}
        />
        <div className="flex-1 pb-6">
          <h2
            className="font-display text-base font-bold mb-3"
            style={{ color: accent }}
          >
            {section.heading}
          </h2>
          {/* Render **bold** inline markers */}
          <p className="text-text-secondary text-sm font-body leading-relaxed whitespace-pre-line">
            {section.body.split(/\*\*(.+?)\*\*/g).map((part, i) =>
              i % 2 === 1
                ? <strong key={i} className="text-text-primary font-medium">{part}</strong>
                : <span key={i}>{part}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sticky progress bar ───────────────────────────────────────────────────────
function ReadProgress({ progress }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-30 h-0.5">
      <div
        className="h-full transition-all duration-300"
        style={{
          width:      `${progress}%`,
          background: 'linear-gradient(90deg, #f5c542, #6ee7b7)',
        }}
      />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ModuleDetail() {
  const { moduleId }    = useParams();
  const navigate        = useNavigate();
  const module          = getModuleById(moduleId);

  const [quizMode,      setQuizMode]      = useState(false);
  const [readProgress,  setReadProgress]  = useState(0);
  const [alreadyPassed, setAlreadyPassed] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('fy_completed_modules') ?? '[]');
      return ids.includes(moduleId);
    } catch { return false; }
  });

  // Read-progress tracker
  useEffect(() => {
    const onScroll = () => {
      const el  = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setReadProgress(Math.min(100, Math.round(pct)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!module) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-text-secondary font-body">Module not found.</p>
          <button onClick={() => navigate('/learn')} className="btn-ghost mt-4 w-auto px-6">
            ← Back to Learn
          </button>
        </div>
      </div>
    );
  }

  const handleQuizComplete = (passed) => {
    if (passed) setAlreadyPassed(true);
    setQuizMode(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (quizMode) {
    return (
      <Quiz
        module={module}
        onComplete={handleQuizComplete}
        onBack={() => setQuizMode(false)}
      />
    );
  }

  return (
    <>
      <ReadProgress progress={readProgress} />

      <div className="min-h-dvh">
        {/* Hero gradient */}
        <div
          className="fixed inset-x-0 top-0 h-64 pointer-events-none z-0"
          style={{
            background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${module.accent}10 0%, transparent 65%)`,
          }}
        />

        <div className="relative z-10 max-w-lg mx-auto px-4 pt-10 pb-28">

          {/* ── Back button ── */}
          <button
            onClick={() => navigate('/learn')}
            className="flex items-center gap-1.5 text-text-secondary text-sm font-body mb-8
                       hover:text-text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            All Modules
          </button>

          {/* ── Module hero ── */}
          <div className="mb-8 animate-fade-up">
            {/* Icon + badges row */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border"
                style={{ background: `${module.accent}15`, borderColor: `${module.accent}30` }}
              >
                {module.icon}
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                    style={{ color: module.accent, borderColor: `${module.accent}40`, background: `${module.accent}10` }}
                  >
                    {module.difficulty}
                  </span>
                  <span className="text-[10px] font-mono text-muted px-2 py-0.5 rounded-full border border-border bg-surface-2">
                    ⏱ {module.duration}
                  </span>
                  <span className="text-[10px] font-mono text-muted px-2 py-0.5 rounded-full border border-border bg-surface-2">
                    +{module.xp} XP
                  </span>
                </div>
                {alreadyPassed && (
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border w-fit"
                    style={{ color: module.accent, borderColor: `${module.accent}40`, background: `${module.accent}10` }}
                  >
                    ✓ Quiz Passed
                  </span>
                )}
              </div>
            </div>

            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight mb-2">
              {module.title}
            </h1>
            <p className="text-text-secondary text-sm font-body leading-relaxed">
              {module.tagline}
            </p>
          </div>

          {/* ── Content sections ── */}
          <div className="space-y-0 mb-10">
            {module.sections.map((section, i) => (
              <Section key={i} section={section} index={i} accent={module.accent} />
            ))}
          </div>

          {/* ── Quiz CTA ── */}
          <div
            className="rounded-2xl p-6 border text-center"
            style={{
              background:  `linear-gradient(135deg, ${module.accent}08 0%, transparent 100%)`,
              borderColor: `${module.accent}25`,
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border"
              style={{ background: `${module.accent}15`, borderColor: `${module.accent}40` }}
            >
              {alreadyPassed ? '🏆' : '🧠'}
            </div>
            <h3 className="font-display text-lg font-bold text-text-primary mb-1">
              {alreadyPassed ? 'Quiz Completed!' : 'Ready to Test Yourself?'}
            </h3>
            <p className="text-text-secondary text-sm font-body mb-5">
              {alreadyPassed
                ? `You've already passed the ${module.title} quiz. Take it again for practice.`
                : `${module.quiz.length} multiple-choice questions. Pass with ≥70% to earn +${module.xp} XP.`}
            </p>
            <button
              onClick={() => setQuizMode(true)}
              className="font-display font-bold py-3.5 px-8 rounded-xl
                         hover:opacity-90 active:scale-95 transition-all duration-200
                         text-sm tracking-wide text-ink"
              style={{ background: module.accent }}
            >
              {alreadyPassed ? '↺ Retake Quiz' : '▶ Start Quiz'}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}