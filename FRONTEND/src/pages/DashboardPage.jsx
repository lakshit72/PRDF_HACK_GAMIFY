/**
 * pages/DashboardPage.jsx — NPS institutional dashboard.
 * Light background, structured layout matching eNPS portal patterns.
 */
import { useEffect } from 'react';
import { useUserData } from '../context/UserDataContext.jsx';
import Header        from '../components/dashboard/Header.jsx';
import ScoreCard     from '../components/dashboard/ScoreCard.jsx';
import StreakCard    from '../components/dashboard/StreakCard.jsx';
import QuestCard    from '../components/dashboard/QuestCard.jsx';
import FutureSelfCard from '../components/dashboard/FutureSelfCard.jsx';
import QuickActions  from '../components/dashboard/QuickActions.jsx';
import { ErrorBanner } from '../components/ui/index.jsx';

export default function DashboardPage() {
  const { profile, streak, score, quests, futureSelf, loading, error, refresh } = useUserData();

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  return (
    <div className="min-h-dvh nps-watermark" style={{ background: '#F0F4FA' }}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">

        <Header />

        {error && (
          <div className="mb-4">
            <ErrorBanner message={error} onDismiss={() => {}} />
          </div>
        )}

        <div className="space-y-4 stagger">

          {/* NPS Readiness Score — full width */}
          <div className="animate-fade-up">
            <ScoreCard score={score} loading={loading} />
          </div>

          {/* Streak + Quest — side by side */}
          <div className="grid grid-cols-2 gap-4 animate-fade-up">
            <StreakCard streak={streak} loading={loading} />
            <QuestCard  quests={quests} loading={loading} />
          </div>

          {/* Future Self projection */}
          <div className="animate-fade-up">
            <FutureSelfCard futureSelf={futureSelf} loading={loading} />
          </div>

          {/* Quick Services */}
          <div className="animate-fade-up">
            <QuickActions />
          </div>

          {/* Disclaimer footer */}
          <div className="info-banner animate-fade-up">
            <span className="text-blue-600 text-sm shrink-0">ℹ</span>
            <p className="text-blue-800 text-[11px] font-body leading-relaxed">
              FutureYou is for educational purposes only. Not affiliated with PFRDA. 
              For official NPS transactions, visit{' '}
              <a href="https://enps.nsdl.com" target="_blank" rel="noreferrer"
                 className="underline font-medium">enps.nsdl.com</a>.
            </p>
          </div>
        </div>

        {/* Refresh */}
        <div className="text-center mt-6">
          <button
            onClick={refresh}
            disabled={loading}
            className="text-text-secondary text-xs font-body hover:text-ink transition-colors disabled:opacity-40"
          >
            ↻ Refresh dashboard
          </button>
        </div>
      </div>
    </div>
  );
}