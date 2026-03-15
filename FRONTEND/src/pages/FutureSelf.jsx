/**
 * pages/FutureSelf.jsx
 *
 * Full Future Self page — shows the user's personal caricature (from photo upload)
 * alongside their AI-generated letter and corpus projections.
 *
 * Avatar priority:
 *   1. user.caricatures[0]   — personal caricature from photo upload
 *   2. DEFAULT_AVATAR        — built-in SVG fallback (always available)
 */
import { useState, useEffect } from 'react';
import { useNavigate }          from 'react-router-dom';
import { useUserData }          from '../context/UserDataContext.jsx';
import { useAuth }              from '../context/AuthContext.jsx';
import { futureSelfApi }        from '../services/api.js';
import { useToast }             from '../components/shared/Toast.jsx';
import RegenerateModal          from '../components/futureself/RegenerateModal.jsx';
import CorpusStats              from '../components/futureself/CorpusStats.jsx';
import FutureLetter             from '../components/futureself/FutureLetter.jsx';
import { Spinner, Skeleton }    from '../components/ui/index.jsx';

// ── Inline SVG fallback — no file needed ─────────────────────────────────────
const DEFAULT_AVATAR = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs><radialGradient id="bg" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#FFF9F0"/><stop offset="100%" stop-color="#FFE0B2"/>
  </radialGradient></defs>
  <circle cx="100" cy="100" r="98" fill="url(#bg)" stroke="#F47920" stroke-width="3"/>
  <ellipse cx="100" cy="108" rx="44" ry="52" fill="#FDBF7B"/>
  <path d="M56 82 Q56 44 100 41 Q144 44 144 82 L137 77 Q128 48 100 46 Q72 48 63 77 Z" fill="#ECEFF1"/>
  <ellipse cx="82" cy="97" rx="7" ry="5" fill="#5D4037"/>
  <ellipse cx="118" cy="97" rx="7" ry="5" fill="#5D4037"/>
  <circle cx="82" cy="97" r="12" fill="none" stroke="#78909C" stroke-width="2"/>
  <circle cx="118" cy="97" r="12" fill="none" stroke="#78909C" stroke-width="2"/>
  <line x1="94" y1="97" x2="106" y2="97" stroke="#78909C" stroke-width="2"/>
  <path d="M82 118 Q100 130 118 118" stroke="#8B4513" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <text x="100" y="185" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="700" fill="#001F4D">Future You · Age 60</text>
</svg>`)}`;

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-center">
        <Skeleton className="w-40 h-40 rounded-full" />
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
  const navigate                                       = useNavigate();
  const { user }                                       = useAuth();
  const { futureSelf, saveFutureSelf, score, profile } = useUserData();
  const { addToast }                                   = useToast();

  const [loading,    setLoading]    = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [localData,  setLocalData]  = useState(futureSelf);
  const [imgError,   setImgError]   = useState(false);

  useEffect(() => { setLocalData(futureSelf); }, [futureSelf]);

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
      const msg = err.response?.data?.error ?? 'Could not generate future self.';
      addToast(msg, 'error');
      if (err.response?.data?.projectedCorpus) {
        setLocalData(err.response.data);
        saveFutureSelf(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Avatar resolution ─────────────────────────────────────────────────────
  // Use personal caricature if available, otherwise built-in SVG default
  const avatarSrc = (!imgError && user?.caricatures?.[0])
    ? user.caricatures[0]
    : DEFAULT_AVATAR;

  const isPersonalAvatar = !imgError && !!user?.caricatures?.[0];

  return (
    <>
      <div className="min-h-dvh" style={{ background: '#F0F4FA' }}>
        <div className="max-w-lg mx-auto px-4 pt-10 pb-28">

          {/* Back + Edit */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-text-secondary text-sm font-body
                         hover:text-ink transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => setModalOpen(true)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-body border border-border
                         rounded-full px-3 py-1.5 text-text-secondary bg-white
                         hover:border-gold/40 hover:text-gold transition-all duration-200
                         disabled:opacity-40"
            >
              ✎ Adjust Inputs
            </button>
          </div>

          {/* Page title */}
          <div className="text-center mb-8">
            <p className="text-muted text-xs uppercase tracking-widest font-body mb-1">Age 60</p>
            <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">
              Your Future Self
            </h1>
          </div>

          {loading ? (
            <PageSkeleton />
          ) : localData ? (
            <div className="space-y-6 stagger">

              {/* ── Personal Avatar ── */}
              <div className="flex flex-col items-center gap-3 animate-fade-up">
                <div className="relative">
                  {/* Ring: gold if personal, grey if default */}
                  <div
                    className="w-40 h-40 rounded-full overflow-hidden shadow-xl"
                    style={{
                      border: isPersonalAvatar ? '4px solid #F47920' : '3px solid #C8D6E8',
                      boxShadow: isPersonalAvatar
                        ? '0 0 0 4px rgba(244,121,32,0.15), 0 8px 32px rgba(0,31,77,0.15)'
                        : '0 4px 16px rgba(0,31,77,0.1)',
                    }}
                  >
                    <img
                      src={avatarSrc}
                      alt="Your future self at 60"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  </div>

                  {/* Verified badge if using personal caricature */}
                  {isPersonalAvatar && (
                    <div
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full
                                 flex items-center justify-center text-white text-sm border-2 border-white"
                      style={{ background: '#F47920' }}
                      title="Your personal avatar"
                    >
                      ✓
                    </div>
                  )}
                </div>

                {/* Avatar source label */}
                <p className="text-text-secondary text-xs font-body">
                  {isPersonalAvatar
                    ? '📸 Your personalised avatar'
                    : '🔮 AI-generated avatar · Upload a photo for a personalised one'
                  }
                </p>

                {/* Upload photo CTA if using default */}
                {!isPersonalAvatar && (
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="text-xs font-body font-medium px-3 py-1.5 rounded-full border
                               transition-all duration-200"
                    style={{ borderColor: '#F47920', color: '#F47920', background: 'rgba(244,121,32,0.05)' }}
                  >
                    📸 Upload photo for personal avatar
                  </button>
                )}
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
                <div className="info-banner animate-fade-up">
                  <span className="text-blue-600 text-sm shrink-0">ℹ</span>
                  <p className="text-blue-800 text-xs font-body">{localData.warning}</p>
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
                             hover:border-gold/40 hover:text-gold disabled:opacity-40"
                >
                  ↺ Regenerate
                </button>
              </div>

              {/* ── CTA to Time Machine ── */}
              <div className="info-banner animate-fade-up" style={{ animationDelay: '400ms' }}>
                <span className="text-blue-600 shrink-0">⏳</span>
                <div>
                  <p className="text-blue-800 text-xs font-body mb-1">
                    Curious how small habits change this picture?
                  </p>
                  <button
                    onClick={() => navigate('/time-machine')}
                    className="text-blue-700 text-xs font-body font-semibold hover:underline"
                  >
                    Try the Time Machine →
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* Empty state */
            <div className="card text-center py-10">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 border-2 border-border">
                <img src={DEFAULT_AVATAR} alt="Future You" className="w-full h-full object-cover" />
              </div>
              <h2 className="font-display text-xl font-bold text-ink mb-2">
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

      {/* Regenerate modal */}
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