/**
 * pages/FutureSelf.jsx
 *
 * The Future Self page — AI-generated avatar, letter, and retirement projections.
 *
 * Features:
 *  - Animated avatar SVG with NPS-tier colour theme
 *  - Animated corpus counters
 *  - AI letter with fade-in reveal
 *  - Regenerate modal with sliders
 *  - Toast error handling
 *  - Full skeleton loading state
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData }   from '../context/UserDataContext.jsx';
import { useAuth }       from '../context/AuthContext.jsx';
import { futureSelfApi } from '../services/api.js';
import { useToast }      from '../components/shared/Toast.jsx';
import FutureSelfAvatar  from '../components/futureself/FutureSelfAvatar.jsx';
import CorpusStats       from '../components/futureself/CorpusStats.jsx';
import FutureLetter      from '../components/futureself/FutureLetter.jsx';
import RegenerateModal   from '../components/futureself/RegenerateModal.jsx';
import { Skeleton }      from '../components/ui/index.jsx';

// ── Skeleton layout while loading ────────────────────────────────────────────
function FutureSelfSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-center">
        <Skeleton className="w-48 h-52 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

export default function FutureSelf() {
  const navigate                      = useNavigate();
  const { user }                      = useAuth();
  const { futureSelf, saveFutureSelf, score, profile } = useUserData();
  const { addToast }                  = useToast();

  const [loading,       setLoading]       = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [localData,     setLocalData]     = useState(futureSelf);

  // Sync with context whenever futureSelf changes externally
  useEffect(() => { setLocalData(futureSelf); }, [futureSelf]);

  // Auto-fetch if we have profile data but no future self yet
  useEffect(() => {
    if (!localData && profile?.age && !loading) {
      handleGenerate({
        age:                 profile.age,
        currentNpsBalance:   0,
        monthlyContribution: 0,
        expectedReturn:      10,
        inflation:           6,
      });
    }
  }, [profile]); // eslint-disable-line

  const handleGenerate = async (inputs) => {
    setLoading(true);
    try {
      const { data } = await futureSelfApi.generate(inputs);
      setLocalData(data);
      saveFutureSelf(data);
      addToast('Future self updated! ✨', 'success');
    } catch (err) {
      const msg = err.response?.data?.error
               ?? err.response?.data?.warning
               ?? 'Could not generate future self. Please try again.';
      addToast(msg, 'error');
      // If API returned a warning with corpus data, still show it
      if (err.response?.data?.projectedCorpus) {
        setLocalData(err.response.data);
        saveFutureSelf(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const tier = score?.tier ?? 'Good';

  return (
    <>
      <div className="min-h-dvh">
        {/* Hero background */}
        <div
          className="absolute inset-x-0 top-0 h-64 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,197,66,0.07) 0%, transparent 70%)',
          }}
        />

        <div className="relative max-w-lg mx-auto px-4 pt-10 pb-28">

          {/* ── Top bar ── */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-text-secondary text-sm font-body
                         hover:text-text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => setModalOpen(true)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-body border border-border
                         rounded-full px-3 py-1.5 text-text-secondary
                         hover:border-gold/40 hover:text-gold transition-all duration-200
                         disabled:opacity-40"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              Adjust Inputs
            </button>
          </div>

          {/* ── Page title ── */}
          <div className="text-center mb-8">
            <p className="text-muted text-xs uppercase tracking-widest font-body mb-1">Age 60</p>
            <h1 className="font-display text-3xl font-extrabold text-text-primary tracking-tight">
              Your Future Self
            </h1>
          </div>

          {loading ? (
            <FutureSelfSkeleton />
          ) : localData ? (
            <div className="space-y-6 stagger">

              {/* ── Avatar ── */}
              <div className="flex justify-center animate-fade-up">
                <FutureSelfAvatar
                  initial={user?.email?.[0]?.toUpperCase() ?? '?'}
                  tier={tier}
                />
              </div>

              {/* ── Corpus stats ── */}
              <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                <CorpusStats
                  projectedCorpus={localData.projectedCorpus}
                  inflationAdjustedCorpus={localData.inflationAdjustedCorpus}
                  meta={localData.meta}
                />
              </div>

              {/* ── Letter ── */}
              <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
                <FutureLetter
                  letter={localData.futureLetter}
                  avatarDescription={localData.avatarDescription}
                />
              </div>

              {/* ── Warning if AI was unavailable ── */}
              {localData.warning && (
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-3 animate-fade-up">
                  <p className="text-gold/70 text-xs font-body">⚠ {localData.warning}</p>
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '300ms' }}>
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex-1 btn-ghost flex items-center justify-center gap-1.5"
                >
                  ✎ Edit Inputs
                </button>
                <button
                  onClick={() => handleGenerate({
                    age:                 profile?.age ?? 25,
                    currentNpsBalance:   0,
                    monthlyContribution: 0,
                    expectedReturn:      10,
                    inflation:           6,
                  })}
                  disabled={loading}
                  className="flex-1 btn-ghost flex items-center justify-center gap-1.5
                             hover:border-gold/40 hover:text-gold"
                >
                  ↺ Regenerate
                </button>
              </div>

              {/* ── CTA to Time Machine ── */}
              <div
                className="rounded-2xl p-4 border border-frost/20 text-center animate-fade-up"
                style={{ background: 'linear-gradient(135deg, #001015 0%, #001a27 100%)', animationDelay: '400ms' }}
              >
                <p className="text-frost/70 text-xs font-body mb-2">
                  Curious how small habits change this picture?
                </p>
                <button
                  onClick={() => navigate('/time-machine')}
                  className="text-frost text-sm font-body font-medium hover:text-frost/80 transition-colors"
                >
                  ⏳ Try the Time Machine →
                </button>
              </div>

            </div>
          ) : (
            /* ── Empty state ── */
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🔮</p>
              <h2 className="font-display text-xl font-bold text-text-primary mb-2">
                Your future awaits
              </h2>
              <p className="text-text-secondary text-sm font-body mb-6 max-w-xs mx-auto">
                Complete your profile to generate a personalised projection and letter.
              </p>
              <button
                onClick={() => navigate('/onboarding')}
                className="btn-primary w-auto px-8"
              >
                Complete Onboarding
              </button>
            </div>
          )}

        </div>
      </div>

      {/* ── Regenerate modal ── */}
      <RegenerateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleGenerate}
        initialValues={{
          age:          profile?.age ?? 25,
          balance:      0,
          contribution: 0,
          returnRate:   10,
          inflation:    6,
        }}
      />
    </>
  );
}