/**
 * components/onboarding/PhotoUploadStep.jsx
 *
 * Onboarding Step 3 — Upload a photo to generate personalised old-age caricatures.
 * Calls POST /api/user/upload-photo (multipart/form-data).
 * On success: saves caricatures[] to AuthContext and advances to next step.
 * On failure or skip: sets caricatures to [] and advances anyway.
 *
 * IMPORTANT: The backend may take 20–60s on Hugging Face cold-start.
 * We show a live progress message that updates every 5s to reassure the user.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { Spinner } from '../ui/index.jsx';

// Max file size: 5 MB
const MAX_BYTES     = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Rotating messages shown while generation takes time (HF can be slow)
const LOADING_MESSAGES = [
  'Uploading your photo...',
  'Analysing your features... ✨',
  'Creating avatar variant 1 of 4...',
  'Creating avatar variant 2 of 4...',
  'Creating avatar variant 3 of 4...',
  'Almost done — adding the final touches! 🎨',
  'This is taking a little longer than usual — HF is warming up...',
  'Still generating — please hold on! 🙏',
];

export default function PhotoUploadStep({ onNext, onBack }) {
  const { updateUser } = useAuth();

  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]       = useState(null);   // object URL for preview
  const [loading,      setLoading]       = useState(false);
  const [error,        setError]         = useState(null);
  const [loadingMsg,   setLoadingMsg]    = useState('');
  const [msgIndex,     setMsgIndex]      = useState(0);

  const inputRef    = useRef(null);
  const msgTimerRef = useRef(null);

  // Rotate loading messages every 5s during generation
  useEffect(() => {
    if (loading) {
      setLoadingMsg(LOADING_MESSAGES[0]);
      setMsgIndex(0);
      msgTimerRef.current = setInterval(() => {
        setMsgIndex(prev => {
          const next = Math.min(prev + 1, LOADING_MESSAGES.length - 1);
          setLoadingMsg(LOADING_MESSAGES[next]);
          return next;
        });
      }, 5000);
    } else {
      clearInterval(msgTimerRef.current);
    }
    return () => clearInterval(msgTimerRef.current);
  }, [loading]);

  // Clean up object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError('File is too large. Maximum size is 5 MB.');
      return;
    }

    setFile(selected);
    // Revoke previous preview URL
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(selected));
  };

  // Drag-and-drop support
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      // Reuse the same validation by simulating an input event
      const dt = new DataTransfer();
      dt.items.add(dropped);
      const fakeEvent = { target: { files: dt.files } };
      handleFileChange(fakeEvent);
    }
  }, []); // eslint-disable-line

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!file) { setError('Please select a photo first.'); return; }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const { data } = await api.post('/user/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // Long timeout — HF cold-start can take up to 90s
        timeout: 120_000,
      });

      // Save caricatures into user context so they're available app-wide
      updateUser({ caricatures: data.caricatures, defaultCaricature: data.defaultCaricature });

      // Advance to next onboarding step
      onNext({ caricatures: data.caricatures });

    } catch (err) {
      console.error('[PhotoUpload] Error:', err);
      const msg =
        err.response?.data?.error ??
        err.response?.data?.warning ??
        (err.code === 'ECONNABORTED'
          ? 'Generation is taking too long. You can skip and use default avatars.'
          : 'Upload failed. Please try again or skip.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Skip ─────────────────────────────────────────────────────────────────────
  const handleSkip = () => {
    // Leave caricatures empty — app uses SVG fallbacks everywhere
    updateUser({ caricatures: [], defaultCaricature: null });
    onNext({ caricatures: [] });
  };

  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-ink mb-1">
        Create your future avatar
      </h2>
      <p className="text-text-secondary text-sm font-body mb-6 leading-relaxed">
        Upload a photo and we'll generate personalised caricatures of you at age 60.
        This step is optional — you can skip and use default avatars.
      </p>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-2xl p-6 mb-4 cursor-pointer
          transition-all duration-200
          ${loading ? 'cursor-not-allowed opacity-60' : 'hover:border-gold/60 hover:bg-gold/5'}
          ${preview ? 'border-gold/40 bg-gold/5' : 'border-border'}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
        />

        {preview ? (
          /* Photo preview */
          <div className="flex flex-col items-center gap-3">
            <img
              src={preview}
              alt="Your photo preview"
              className="w-28 h-28 rounded-full object-cover border-4 border-gold/40 shadow-lg"
            />
            <p className="text-text-secondary text-xs font-body">
              {file?.name} · {(file?.size / 1024 / 1024).toFixed(1)} MB
            </p>
            {!loading && (
              <p className="text-gold text-xs font-body font-medium">
                Tap to change photo
              </p>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="text-4xl">📸</div>
            <p className="text-ink font-body font-semibold text-sm">
              Click or drag a photo here
            </p>
            <p className="text-muted text-xs font-body">
              JPEG, PNG, WebP · Max 5 MB
            </p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-4 mb-4">
          <Spinner size="lg" />
          <p className="text-ink font-body font-semibold text-sm text-center">
            {loadingMsg}
          </p>
          <div className="flex gap-1">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-gold animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="text-muted text-[11px] font-body text-center max-w-xs">
            AI generation can take up to 60 seconds on a free tier. Sit tight!
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <span className="text-red-500 shrink-0 text-sm mt-0.5">⚠</span>
          <p className="text-red-700 text-sm font-body leading-snug">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {/* Upload / Generate */}
        {!loading && (
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
          >
            ✨ Generate My Avatars
          </button>
        )}

        {/* Navigation row */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="btn-ghost flex-1 disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={loading}
            className="flex-1 text-sm font-body text-muted hover:text-text-secondary
                       transition-colors py-2.5 disabled:opacity-40"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}