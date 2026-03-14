/**
 * components/shared/Modal.jsx
 * Accessible, animated modal dialog.
 * Props: isOpen, onClose, title, children
 */
import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm animate-fade-in"
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          relative w-full ${maxWidth} bg-surface border border-border rounded-2xl
          shadow-2xl animate-fade-up z-10
        `}
        style={{ animationDuration: '0.3s' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h3 className="font-display text-lg font-bold text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-muted hover:text-text-primary hover:bg-surface-2
                       transition-all duration-150 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}