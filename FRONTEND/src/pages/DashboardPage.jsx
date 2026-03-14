/**
 * pages/DashboardPage.jsx
 * Main app view. Composes all dashboard widgets.
 * Skeleton loaders shown during initial data fetch.
 */
import { useEffect } from "react";
import { useUserData } from "../context/UserDataContext.jsx";
import Header from "../components/dashboard/Header.jsx";
import ScoreCard from "../components/dashboard/ScoreCard.jsx";
import StreakCard from "../components/dashboard/StreakCard.jsx";
import QuestCard from "../components/dashboard/QuestCard.jsx";
import FutureSelfCard from "../components/dashboard/FutureSelfCard.jsx";
import QuickActions from "../components/dashboard/QuickActions.jsx";
import { ErrorBanner } from "../components/ui/index.jsx";

export default function DashboardPage() {
  const {
    profile,
    streak,
    score,
    quests,
    futureSelf,
    loading,
    error,
    refresh,
  } = useUserData();

  // Refresh on mount to get latest data
  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line

  return (
    <div className="min-h-dvh">
      {/* Max-width container for larger screens */}
      <div className="max-w-lg mx-auto px-4 pt-10 pb-24">
        <Header />

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={() => {}} />
          </div>
        )}

        {/* Staggered card layout */}
        <div className="space-y-4 stagger">
          {/* Row 1: Score (full width) */}
          <div className="animate-fade-up">
            <ScoreCard score={score} loading={loading} />
          </div>

          {/* Row 2: Streak + Quest (side by side) */}
          <div className="grid grid-cols-2 gap-4 animate-fade-up">
            <StreakCard streak={streak} loading={loading} />
            <QuestCard quests={quests} loading={loading} />
          </div>

          {/* Row 3: Future Self (full width) */}
          <div className="animate-fade-up">
            <FutureSelfCard futureSelf={futureSelf} loading={loading} />
          </div>

          {/* Row 4: Quick Actions */}
          <div className="animate-fade-up">
            <QuickActions />
          </div>
        </div>

        {/* Pull-to-refresh hint */}
        <p className="text-center text-muted text-xs font-body mt-8">
          <button
            onClick={refresh}
            disabled={loading}
            className="hover:text-text-secondary transition-colors disabled:opacity-40"
          >
            ↻ Refresh
          </button>
          {" · "}
          <span>Data updates in real time</span>
        </p>
      </div>
    </div>
  );
}
