/**
 * components/GamificationStats.jsx
 *
 * Full gamification dashboard tab:
 *  - Streak widget (current + flame calendar)
 *  - Quest list with animated progress bars
 *  - NPS Readiness Score with radar-style bar breakdown
 *
 * Can be used as a standalone page OR embedded as a tab in a profile page.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { useUserData } from "../context/UserDataContext.jsx";
import { Skeleton } from "./ui/index.jsx";

Chart.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
);

// ─────────────────────────────────────────────────────────────────────────────
// STREAK WIDGET
// ─────────────────────────────────────────────────────────────────────────────

function FlameCalendar({ current }) {
  const days = Array.from(
    { length: 14 },
    (_, i) => i < current % 14 || (current >= 14 && i < 14),
  );
  return (
    <div className="flex gap-1.5 flex-wrap mt-3">
      {days.map((lit, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs
                     transition-all duration-300"
          style={{
            background: lit ? "rgba(255,107,53,0.25)" : "#1e2740",
            border: `1px solid ${lit ? "rgba(255,107,53,0.4)" : "#2a3452"}`,
          }}
        >
          {lit ? "🔥" : ""}
        </div>
      ))}
      <div className="w-full text-muted text-[10px] font-body mt-1">
        Last 14 days
      </div>
    </div>
  );
}

function StreakSection({ streak }) {
  const current = streak?.currentStreak ?? 0;
  const longest = streak?.longestStreak ?? 0;

  return (
    <div className="card relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-ember/10 blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between mb-1 relative">
        <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
          Learning Streak
        </h2>
        {current >= 7 && (
          <span className="text-[10px] font-mono text-ember bg-ember/10 border border-ember/20 px-2 py-0.5 rounded-full">
            On fire 🔥
          </span>
        )}
      </div>

      <div className="flex items-end gap-6 mt-3">
        <div>
          <p className="text-muted text-[10px] font-body uppercase tracking-wide mb-1">
            Current
          </p>
          <div className="flex items-end gap-2">
            <span className="font-display text-5xl font-extrabold text-text-primary leading-none">
              {current}
            </span>
            <span className="text-text-secondary text-sm font-body mb-1">
              days
            </span>
          </div>
        </div>
        <div className="pb-1">
          <p className="text-muted text-[10px] font-body uppercase tracking-wide mb-1">
            Best
          </p>
          <div className="flex items-end gap-1">
            <span className="font-mono text-2xl font-bold text-gold">
              {longest}
            </span>
            <span className="text-muted text-xs font-body mb-0.5">days</span>
          </div>
        </div>
      </div>

      <FlameCalendar current={current} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTS SECTION
// ─────────────────────────────────────────────────────────────────────────────

function QuestRow({ quest, index }) {
  return (
    <div
      className="animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{quest.icon ?? "🎯"}</span>
          <div>
            <p className="text-text-primary text-sm font-body font-medium leading-tight">
              {quest.description}
            </p>
            {quest.reward && (
              <p className="text-muted text-[10px] font-body">
                Reward: <span className="text-gold">{quest.reward}</span>
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 ml-3">
          {quest.completed ? (
            <span className="text-[10px] font-mono font-bold text-sage bg-sage/10 border border-sage/20 px-2 py-0.5 rounded-full">
              ✓ Done
            </span>
          ) : (
            <span className="text-[10px] font-mono text-muted">
              {quest.progress}%
            </span>
          )}
        </div>
      </div>

      <div className="h-2 bg-surface-2 rounded-full overflow-hidden ml-7">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${quest.progress}%`,
            background: quest.completed
              ? "linear-gradient(90deg, #6ee7b7, #34d399)"
              : "linear-gradient(90deg, #f5c542, #fb923c)",
          }}
        />
      </div>
    </div>
  );
}

function QuestsSection({ quests }) {
  const completed = quests.filter((q) => q.completed).length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
          Quests
        </h2>
        <span className="text-muted text-xs font-mono">
          {completed}/{quests.length} complete
        </span>
      </div>

      {quests.length === 0 ? (
        <p className="text-muted text-sm font-body text-center py-4">
          No quests yet
        </p>
      ) : (
        <div className="space-y-5">
          {quests.map((q, i) => (
            <QuestRow key={q.id} quest={q} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NPS READINESS SCORE
// ─────────────────────────────────────────────────────────────────────────────

function RadarChart({ breakdown }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !breakdown) return;
    if (chartRef.current) chartRef.current.destroy();

    const labels = Object.values(breakdown).map((v) => v.label);
    const data = Object.values(breakdown).map((v) => v.score);

    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: "rgba(245,197,66,0.12)",
            borderColor: "#f5c542",
            borderWidth: 2,
            pointBackgroundColor: "#f5c542",
            pointBorderColor: "#0b0f1a",
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#161d2e",
            borderColor: "#2a3452",
            borderWidth: 1,
            titleColor: "#94a3b8",
            bodyColor: "#f5c542",
            titleFont: { family: "DM Sans", size: 11 },
            bodyFont: { family: "DM Mono", size: 13, weight: "bold" },
            padding: 10,
          },
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              color: "#2a3452",
              backdropColor: "transparent",
              font: { size: 9, family: "DM Mono" },
            },
            grid: { color: "#2a3452", lineWidth: 1 },
            angleLines: { color: "#2a3452" },
            pointLabels: {
              color: "#64748b",
              font: { size: 10, family: "DM Sans" },
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
    };
  }, [breakdown]);

  return (
    <div className="relative w-full max-w-[280px] mx-auto">
      <canvas ref={canvasRef} />
    </div>
  );
}

function ComponentBar({ label, score, weight, color = "#f5c542" }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-text-secondary text-xs font-body">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted text-[10px] font-body">{weight}</span>
          <span className="font-mono text-xs font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

const COMPONENT_COLORS = {
  knowledge: "#7dd3fc",
  contribution: "#f5c542",
  consistency: "#ff6b35",
  profile: "#6ee7b7",
  social: "#a78bfa",
};

const TIER_META = {
  Excellent: {
    color: "#6ee7b7",
    bg: "rgba(110,231,183,0.12)",
    border: "rgba(110,231,183,0.25)",
  },
  Good: {
    color: "#f5c542",
    bg: "rgba(245,197,66,0.10)",
    border: "rgba(245,197,66,0.25)",
  },
  Fair: {
    color: "#ff6b35",
    bg: "rgba(255,107,53,0.10)",
    border: "rgba(255,107,53,0.25)",
  },
  "Needs Work": {
    color: "#64748b",
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.20)",
  },
};

function ScoreSection({ score }) {
  const meta = TIER_META[score.tier] ?? TIER_META["Needs Work"];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wide">
          NPS Readiness Score
        </h2>
        <div
          className="px-2.5 py-1 rounded-full border text-xs font-mono font-bold"
          style={{
            color: meta.color,
            background: meta.bg,
            borderColor: meta.border,
          }}
        >
          {score.tier}
        </div>
      </div>

      {/* Score hero */}
      <div className="text-center mb-5">
        <p
          className="font-display text-6xl font-extrabold leading-none mb-1"
          style={{ color: meta.color }}
        >
          {score.score}
        </p>
        <p className="text-muted text-xs font-mono">out of 900</p>
      </div>

      {/* Radar chart */}
      <div className="mb-5">
        <RadarChart breakdown={score.breakdown} />
      </div>

      {/* Component bars */}
      <div className="space-y-3">
        {Object.entries(score.breakdown).map(([key, val]) => (
          <ComponentBar
            key={key}
            label={val.label}
            score={val.score}
            weight={val.weight}
            color={COMPONENT_COLORS[key] ?? "#f5c542"}
          />
        ))}
      </div>

      <p className="text-muted text-[10px] font-body text-right mt-4">
        Last calculated ·{" "}
        {new Date(score.calculatedAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function GamificationStats({ standalone = false }) {
  const navigate = useNavigate();
  const { streak, score, quests, loading, refresh } = useUserData();

  return (
    <div className={standalone ? "min-h-dvh" : ""}>
      {standalone && (
        <>
          {/* Ambient background */}
          <div
            className="fixed inset-x-0 top-0 h-72 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 80% -10%, rgba(245,197,66,0.07) 0%, transparent 60%)," +
                "radial-gradient(ellipse 50% 40% at 20% 30%, rgba(110,231,183,0.05) 0%, transparent 55%)",
            }}
          />
          <div className="relative max-w-lg mx-auto px-4 pt-10 pb-28">
            {/* Back */}
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1.5 text-text-secondary text-sm font-body mb-8
                         hover:text-text-primary transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </button>

            {/* Header */}
            <div className="mb-8">
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl">🎮</span>
                <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight leading-none">
                  Your Progress
                </h1>
              </div>
              <p className="text-text-secondary text-sm font-body">
                Streaks, quests, and your NPS Readiness Score breakdown.
              </p>
            </div>

            <GamificationContent
              streak={streak}
              score={score}
              quests={quests}
              loading={loading}
              refresh={refresh}
            />
          </div>
        </>
      )}

      {!standalone && (
        <GamificationContent
          streak={streak}
          score={score}
          quests={quests}
          loading={loading}
          refresh={refresh}
        />
      )}
    </div>
  );
}

function GamificationContent({ streak, score, quests, loading, refresh }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 stagger">
      <div className="animate-fade-up">
        <StreakSection streak={streak} />
      </div>

      {quests?.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
          <QuestsSection quests={quests} />
        </div>
      )}

      {score && (
        <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
          <ScoreSection score={score} />
        </div>
      )}

      <div
        className="text-center animate-fade-up"
        style={{ animationDelay: "300ms" }}
      >
        <button
          onClick={refresh}
          className="text-muted text-xs font-body hover:text-text-secondary transition-colors"
        >
          ↻ Refresh data
        </button>
      </div>
    </div>
  );
}
