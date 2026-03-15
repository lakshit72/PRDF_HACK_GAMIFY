/**
 * pages/FutureSelf.jsx
 *
 * Future Self page with:
 * - Personal caricature avatar (from photo upload)
 * - Inline photo re-upload modal (doesn't navigate away)
 * - Corpus stats, AI letter, regenerate controls
 */
import { useState, useRef }             from 'react';
import { useNavigate }                  from 'react-router-dom';
import { useUserData }                  from '../context/UserDataContext.jsx';
import { useAuth }                      from '../context/AuthContext.jsx';
import { futureSelfApi }                from '../services/api.js';
import api                              from '../services/api.js';
import { useToast }                     from '../components/shared/Toast.jsx';
import RegenerateModal                  from '../components/futureself/RegenerateModal.jsx';
import CorpusStats                      from '../components/futureself/CorpusStats.jsx';
import FutureLetter                     from '../components/futureself/FutureLetter.jsx';
import { Spinner, Skeleton }            from '../components/ui/index.jsx';

const DEFAULT_AVATAR = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="98" fill="#FFF9F0" stroke="#F47920" stroke-width="3"/>
  <ellipse cx="100" cy="108" rx="44" ry="52" fill="#FDBF7B"/>
  <path d="M56 82 Q56 44 100 41 Q144 44 144 82 L137 77 Q128 48 100 46 Q72 48 63 77 Z" fill="#ECEFF1"/>
  <circle cx="82" cy="97" r="12" fill="none" stroke="#78909C" stroke-width="2"/>
  <circle cx="118" cy="97" r="12" fill="none" stroke="#78909C" stroke-width="2"/>
  <line x1="94" y1="97" x2="106" y2="97" stroke="#78909C" stroke-width="2"/>
  <ellipse cx="82" cy="97" rx="5" ry="4" fill="#5D4037"/>
  <ellipse cx="118" cy="97" rx="5" ry="4" fill="#5D4037"/>
  <path d="M82 118 Q100 130 118 118" stroke="#8B4513" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <text x="100" y="185" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#001F4D" font-weight="bold">Future You · Age 60</text>
</svg>`)}`;

// ── Inline photo upload modal ─────────────────────────────────────────────────
function PhotoUploadModal({ onClose, onSuccess }) {
  const [file,     setFile]    = useState(null);
  const [preview,  setPreview] = useState(null);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(null);
  const [msg,      setMsg]     = useState('');
  const inputRef               = useRef(null);
  const timerRef               = useRef(null);

  const MSGS = [
    'Uploading photo...',
    'Analysing features... ✨',
    'Generating avatar 1/4...',
    'Generating avatar 2/4...',
    'Generating avatar 3/4...',
    'Almost done! 🎨',
  ];

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File too large — max 5 MB'); return; }
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(f.type)) {
      setError('Only JPEG, PNG, or WebP allowed'); return;
    }
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a photo'); return; }
    setLoading(true); setError(null);
    let idx = 0;
    setMsg(MSGS[0]);
    timerRef.current = setInterval(() => {
      idx = Math.min(idx + 1, MSGS.length - 1);
      setMsg(MSGS[idx]);
    }, 5000);

    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post('/user/upload-photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      clearInterval(timerRef.current);
      onSuccess(data);
    } catch (err) {
      clearInterval(timerRef.current);
      setError(err.response?.data?.error ?? 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-ink text-lg">Update Your Avatar</h3>
          <button onClick={onClose} className="text-muted hover:text-ink text-2xl leading-none">×</button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => !loading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-4
            transition-all ${preview ? 'border-gold/40 bg-gold/5' : 'border-border hover:border-gold/40'}`}
        >
          <input ref={inputRef} type="file" className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={e => handleFile(e.target.files?.[0])} />
          {preview ? (
            <div className="flex flex-col items-center gap-2">
              <img src={preview} className="w-24 h-24 rounded-full object-cover border-4 border-gold/40" alt="preview" />
              <p className="text-xs text-muted font-body">{file?.name} · Tap to change</p>
            </div>
          ) : (
            <div>
              <p className="text-3xl mb-2">📸</p>
              <p className="text-sm font-body text-ink font-medium">Click to select photo</p>
              <p className="text-xs text-muted font-body">JPEG, PNG, WebP · Max 5 MB</p>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-3 mb-3">
            <Spinner size="md" />
            <p className="text-sm font-body text-ink mt-2">{msg}</p>
            <p className="text-xs text-muted font-body mt-1">This may take up to 60 seconds</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-red-700 text-sm font-body">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1" disabled={loading}>Cancel</button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary flex-[2] flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {loading ? <><Spinner size="sm" /> Generating...</> : '✨ Generate Avatars'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-center"><Skeleton className="w-40 h-40 rounded-full" /></div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FutureSelf() {
  const navigate                                       = useNavigate();
  const { user, updateUser }                           = useAuth();
  const { futureSelf, saveFutureSelf, score, profile } = useUserData();
  const { addToast }                                   = useToast();

  const [loading,       setLoading]      = useState(false);
  const [modalOpen,     setModalOpen]    = useState(false);
  const [uploadOpen,    setUploadOpen]   = useState(false);
  const [localData,     setLocalData]    = useState(futureSelf);
  const [imgError,      setImgError]     = useState(false);

  // Re-sync when context updates
  useState(() => { setLocalData(futureSelf); }, [futureSelf]);

  const handleGenerate = async (inputs) => {
    setLoading(true);
    try {
      const { data } = await futureSelfApi.generate(inputs);
      setLocalData(data);
      saveFutureSelf(data);
      addToast('Future self updated! ✨', 'success');
    } catch (err) {
      addToast(err.response?.data?.error ?? 'Could not generate.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSuccess = (data) => {
    updateUser({ caricatures: data.caricatures, defaultCaricature: data.defaultCaricature });
    setImgError(false);
    setUploadOpen(false);
    addToast('Avatar updated! 🎉', 'success');
  };

  const avatarSrc    = (!imgError && user?.caricatures?.[0]) ? user.caricatures[0] : DEFAULT_AVATAR;
  const isPersonal   = !imgError && !!user?.caricatures?.[0];

  return (
    <>
      <div className="min-h-dvh" style={{ background: '#F0F4FA' }}>
        <div className="max-w-lg mx-auto px-4 pt-10 pb-28">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1.5 text-text-secondary text-sm font-body hover:text-ink transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Dashboard
            </button>
            <button onClick={() => setModalOpen(true)} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-body border border-border
                         rounded-full px-3 py-1.5 text-text-secondary bg-white
                         hover:border-gold/40 hover:text-gold transition-all disabled:opacity-40">
              ✎ Adjust Inputs
            </button>
          </div>

          <div className="text-center mb-8">
            <p className="text-muted text-xs uppercase tracking-widest font-body mb-1">Age 60</p>
            <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">Your Future Self</h1>
          </div>

          {loading ? <PageSkeleton /> : localData ? (
            <div className="space-y-6 stagger">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 animate-fade-up">
                <div className="relative">
                  <div className="w-40 h-40 rounded-full overflow-hidden shadow-xl"
                    style={{
                      border: isPersonal ? '4px solid #F47920' : '3px solid #C8D6E8',
                      boxShadow: isPersonal ? '0 0 0 4px rgba(244,121,32,0.15), 0 8px 32px rgba(0,31,77,0.12)' : undefined,
                    }}>
                    <img src={avatarSrc} alt="Your future self"
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)} />
                  </div>
                  {isPersonal && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white
                                    flex items-center justify-center text-white text-sm"
                      style={{ background: '#F47920' }}>✓</div>
                  )}
                </div>

                {/* Upload / change photo button — works inline */}
                <button
                  onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-body font-medium px-4 py-2 rounded-full
                             border transition-all duration-200"
                  style={{
                    borderColor: '#F47920',
                    color:       '#F47920',
                    background:  'rgba(244,121,32,0.05)',
                  }}
                >
                  📸 {isPersonal ? 'Change photo' : 'Upload photo for personal avatar'}
                </button>
              </div>

              {/* Corpus stats */}
              <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
                <CorpusStats
                  projectedCorpus={localData.projectedCorpus}
                  inflationAdjustedCorpus={localData.inflationAdjustedCorpus}
                  meta={localData.meta}
                />
              </div>

              {/* Letter */}
              <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
                <FutureLetter letter={localData.futureLetter} avatarDescription={localData.avatarDescription} />
              </div>

              {localData.warning && (
                <div className="info-banner animate-fade-up">
                  <span className="text-blue-600 text-sm shrink-0">ℹ</span>
                  <p className="text-blue-800 text-xs font-body">{localData.warning}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '300ms' }}>
                <button onClick={() => setModalOpen(true)} className="flex-1 btn-ghost">✎ Edit Inputs</button>
                <button onClick={() => handleGenerate({ age: profile?.age ?? 25, currentNpsBalance: 0, monthlyContribution: 0, expectedReturn: 10, inflation: 6 })}
                  disabled={loading} className="flex-1 btn-ghost hover:border-gold/40 hover:text-gold disabled:opacity-40">
                  ↺ Regenerate
                </button>
              </div>

              <div className="info-banner animate-fade-up" style={{ animationDelay: '400ms' }}>
                <span className="text-blue-600 shrink-0">⏳</span>
                <div>
                  <p className="text-blue-800 text-xs font-body mb-1">Curious how habits change this?</p>
                  <button onClick={() => navigate('/time-machine')}
                    className="text-blue-700 text-xs font-body font-semibold hover:underline">
                    Try the Time Machine →
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-10">
              <img src={DEFAULT_AVATAR} alt="" className="w-20 h-20 mx-auto rounded-full mb-4 border-2 border-border" />
              <h2 className="font-display text-xl font-bold text-ink mb-2">Your future awaits</h2>
              <p className="text-text-secondary text-sm font-body mb-6 max-w-xs mx-auto">
                Complete your profile to generate a personalised projection.
              </p>
              <button onClick={() => navigate('/onboarding')} className="btn-primary w-auto px-8">
                Complete Onboarding
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Adjust inputs modal */}
      <RegenerateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRegenerate={handleGenerate}
        initialValues={{ age: profile?.age ?? 25, balance: 0, contribution: 0, returnRate: 10, inflation: 6 }}
      />

      {/* Inline photo upload modal */}
      {uploadOpen && (
        <PhotoUploadModal
          onClose={() => setUploadOpen(false)}
          onSuccess={handlePhotoSuccess}
        />
      )}
    </>
  );
}