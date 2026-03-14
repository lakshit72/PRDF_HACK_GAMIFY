/**
 * components/quiz/Quiz.jsx
 *
 * Full quiz interface:
 *  - Question progress bar
 *  - Animated option selection
 *  - Submit answers to /api/gamification/quiz/submit
 *  - Score result with correct-answer review
 *  - canvas-confetti on pass (≥70%)
 *  - Updates localStorage + triggers UserDataContext refresh
 *
 * Requires: npm install canvas-confetti
 */
import { useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { gamificationApi } from '../../services/api.js';
import { useUserData }     from '../../context/UserDataContext.jsx';
import { useToast }        from '../shared/Toast.jsx';
import { Spinner }         from '../ui/index.jsx';

const PASS_THRESHOLD = 70;

// ── Confetti burst ────────────────────────────────────────────────────────────
const fireConfetti = (accent) => {
  const color = accent ?? '#f5c542';
  confetti({
    particleCount: 120,
    spread:        80,
    origin:        { y: 0.55 },
    colors:        [color, '#ffffff', '#6ee7b7', '#f5c542'],
  });
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle:         60,
      spread:        55,
      origin:        { x: 0 },
      colors:        [color, '#f5c542'],
    });
    confetti({
      particleCount: 60,
      angle:         120,
      spread:        55,
      origin:        { x: 1 },
      colors:        [color, '#7dd3fc'],
    });
  }, 200);
};

// ── Option button ─────────────────────────────────────────────────────────────
function OptionButton({ label, text, selected, correct, revealed, onClick, accent }) {
  let bg    = 'bg-surface-2 border-border hover:border-border/70';
  let textC = 'text-text-secondary group-hover:text-text-primary';
  let badge = null;

  if (revealed) {
    if (correct) {
      bg    = 'bg-sage/10 border-sage/40';
      textC = 'text-sage';
      badge = <span className="text-sage text-sm">✓</span>;
    } else if (selected && !correct) {
      bg    = 'bg-red-500/10 border-red-500/30';
      textC = 'text-red-300';
      badge = <span className="text-red-400 text-sm">✕</span>;
    }
  } else if (selected) {
    bg    = `border-[${accent}]/60`;
    textC = 'text-text-primary';
    badge = <div className="w-2 h-2 rounded-full" style={{ background: accent }} />;
  }

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      className={`
        group w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border
        text-left transition-all duration-200 disabled:cursor-default
        ${bg}
      `}
      style={selected && !revealed ? { borderColor: `${accent}60`, background: `${accent}08` } : {}}
    >
      {/* Option label (A/B/C/D) */}
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 border transition-all duration-200"
        style={
          selected && !revealed
            ? { color: accent, borderColor: `${accent}60`, background: `${accent}15` }
            : { color: '#64748b', borderColor: '#2a3452', background: '#1e2740' }
        }
      >
        {label}
      </span>

      <span className={`flex-1 text-sm font-body leading-snug ${textC}`}>{text}</span>

      {badge && <span className="shrink-0">{badge}</span>}
    </button>
  );
}

const LABELS = ['A', 'B', 'C', 'D'];

// ── Result screen ─────────────────────────────────────────────────────────────
function QuizResult({ module, score, passed, answers, onRetake, onBack }) {
  return (
    <div className="animate-fade-up space-y-5">
      {/* Score hero */}
      <div
        className="rounded-2xl p-6 text-center border"
        style={{
          background:   passed
            ? `linear-gradient(135deg, ${module.accent}12 0%, transparent 100%)`
            : 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 100%)',
          borderColor:  passed ? `${module.accent}30` : 'rgba(239,68,68,0.25)',
        }}
      >
        <p className="text-5xl mb-3">{passed ? '🏆' : '📖'}</p>
        <p className="font-display text-4xl font-extrabold mb-1"
           style={{ color: passed ? module.accent : '#f87171' }}>
          {score}%
        </p>
        <p className="font-display text-lg font-bold text-text-primary mb-1">
          {passed ? 'Quiz Passed!' : 'Not quite yet'}
        </p>
        <p className="text-text-secondary text-sm font-body">
          {passed
            ? `You've earned +${module.xp} XP and completed the ${module.title} module.`
            : `You need 70% to pass. Review the sections and try again!`}
        </p>
      </div>

      {/* Answer review */}
      <div className="card">
        <h3 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide mb-4">
          Review Your Answers
        </h3>
        <div className="space-y-4">
          {module.quiz.map((q, qi) => {
            const userAnswer    = answers[qi];
            const isCorrect     = userAnswer === q.correct;
            return (
              <div key={qi} className="space-y-2">
                <p className="text-text-primary text-sm font-body font-medium leading-snug">
                  <span className="text-muted font-mono mr-1.5">Q{qi + 1}.</span>
                  {q.question}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {q.options.map((opt, oi) => {
                    const isUser    = oi === userAnswer;
                    const isCorrectOpt = oi === q.correct;
                    let cls = 'text-muted text-xs font-body px-3 py-2 rounded-lg border ';
                    if (isCorrectOpt) cls += 'border-sage/30 bg-sage/8 text-sage';
                    else if (isUser && !isCorrectOpt) cls += 'border-red-500/25 bg-red-500/8 text-red-300/80';
                    else cls += 'border-border/50 text-muted/60';

                    return (
                      <div key={oi} className={cls}>
                        <span className="font-mono mr-2">{LABELS[oi]}.</span>
                        {opt}
                        {isCorrectOpt && <span className="ml-2 text-sage text-xs">✓</span>}
                        {isUser && !isCorrectOpt && <span className="ml-2 text-red-400 text-xs">✕ your answer</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-ghost flex-1">← Back to Module</button>
        <button
          onClick={onRetake}
          className="flex-1 font-display font-bold py-3.5 px-6 rounded-xl
                     hover:opacity-90 active:scale-95 transition-all duration-200 text-sm text-ink"
          style={{ background: module.accent }}
        >
          ↺ Retake
        </button>
      </div>
    </div>
  );
}

// ── Main quiz component ───────────────────────────────────────────────────────
export default function Quiz({ module, onComplete, onBack }) {
  const { refresh }          = useUserData();
  const { addToast }         = useToast();

  const [currentQ,   setCurrentQ]   = useState(0);
  const [answers,    setAnswers]     = useState(Array(module.quiz.length).fill(null));
  const [submitted,  setSubmitted]   = useState(false);
  const [result,     setResult]      = useState(null);
  const [loading,    setLoading]     = useState(false);
  const [revealed,   setRevealed]    = useState(false);  // shows correct/wrong per-question during review

  const q    = module.quiz[currentQ];
  const pct  = Math.round(((currentQ + (answers[currentQ] !== null ? 1 : 0)) / module.quiz.length) * 100);
  const isLast = currentQ === module.quiz.length - 1;

  const selectAnswer = useCallback((optIndex) => {
    if (revealed) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[currentQ] = optIndex;
      return next;
    });
  }, [currentQ, revealed]);

  const goNext = () => {
    setRevealed(false);
    setCurrentQ((q) => q + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await gamificationApi.submitQuiz({
        moduleId: module.id,
        answers:  answers.map((a) => a ?? 0),
      });

      setResult(data);
      setSubmitted(true);

      if (data.passed) {
        // Save completion locally
        const prev = JSON.parse(localStorage.getItem('fy_completed_modules') ?? '[]');
        if (!prev.includes(module.id)) {
          localStorage.setItem('fy_completed_modules', JSON.stringify([...prev, module.id]));
        }
        fireConfetti(module.accent);
        addToast(`🏆 ${module.title} completed! +${module.xp} XP earned`, 'success', 5000);
      } else {
        addToast(`Score: ${data.score}% — Need 70% to pass. Keep learning!`, 'info');
      }

      // Refresh gamification data in context
      await refresh();
    } catch (err) {
      addToast(
        err.response?.data?.errors?.[0]?.msg ?? 'Quiz submission failed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted && result) {
    return (
      <div className="min-h-dvh">
        <div className="max-w-lg mx-auto px-4 pt-10 pb-28">
          <button
            onClick={() => onComplete(result.passed)}
            className="flex items-center gap-1.5 text-text-secondary text-sm font-body mb-8
                       hover:text-text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Module
          </button>
          <QuizResult
            module={module}
            score={result.score}
            passed={result.passed}
            answers={answers}
            onRetake={() => {
              setAnswers(Array(module.quiz.length).fill(null));
              setCurrentQ(0);
              setSubmitted(false);
              setResult(null);
              setRevealed(false);
            }}
            onBack={() => onComplete(result.passed)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* Top accent bar */}
      <div
        className="fixed top-0 left-0 right-0 z-30 h-1"
        style={{ background: `linear-gradient(90deg, ${module.accent}, ${module.accentDim})` }}
      />

      {/* Progress */}
      <div className="fixed top-1 left-0 right-0 z-30 h-0.5 bg-surface-2">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${pct}%`, background: module.accent }}
        />
      </div>

      <div className="max-w-lg mx-auto px-4 pt-12 pb-28">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-text-secondary text-sm font-body hover:text-text-primary transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Exit Quiz
          </button>

          <div className="flex items-center gap-2">
            <span className="text-muted text-xs font-mono">
              {currentQ + 1}/{module.quiz.length}
            </span>
            <div className="flex gap-1">
              {module.quiz.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width:      i === currentQ ? '20px' : '6px',
                    background: answers[i] !== null ? module.accent : '#2a3452',
                    opacity:    i < currentQ ? 0.6 : 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Question card ── */}
        <div
          key={currentQ}
          className="animate-fade-up mb-6"
          style={{ animationDuration: '0.3s' }}
        >
          {/* Module badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-base">{module.icon}</span>
            <span
              className="text-[10px] font-mono font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border"
              style={{ color: module.accent, borderColor: `${module.accent}40`, background: `${module.accent}10` }}
            >
              {module.title}
            </span>
          </div>

          {/* Question */}
          <h2 className="font-display text-xl font-bold text-text-primary leading-snug mb-6">
            {q.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {q.options.map((opt, oi) => (
              <OptionButton
                key={oi}
                label={LABELS[oi]}
                text={opt}
                selected={answers[currentQ] === oi}
                correct={oi === q.correct}
                revealed={revealed}
                onClick={() => selectAnswer(oi)}
                accent={module.accent}
              />
            ))}
          </div>
        </div>

        {/* ── Navigation ── */}
        <div className="flex gap-3">
          {currentQ > 0 && (
            <button
              onClick={() => { setCurrentQ((q) => q - 1); setRevealed(false); }}
              className="btn-ghost w-auto px-5"
            >
              ←
            </button>
          )}

          {!isLast ? (
            <button
              onClick={goNext}
              disabled={answers[currentQ] === null}
              className="btn-primary flex-1 disabled:opacity-40"
              style={{ background: answers[currentQ] !== null ? module.accent : undefined }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={answers.includes(null) || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: !answers.includes(null) ? module.accent : undefined }}
            >
              {loading ? <><Spinner size="sm" /> Submitting…</> : '✓ Submit Answers'}
            </button>
          )}
        </div>

        {/* Unanswered hint */}
        {isLast && answers.some((a) => a === null) && (
          <p className="text-center text-muted text-xs font-body mt-3">
            Answer all questions before submitting
            ({answers.filter((a) => a === null).length} remaining)
          </p>
        )}

      </div>
    </div>
  );
}