import React, { useEffect, useState } from 'react';

/**
 * InstallPrompt
 *
 * Shows a bottom-sheet "Add to Home Screen" nudge when:
 *  - The browser fires the `beforeinstallprompt` event (Chrome/Android/Edge)
 *  - OR the user is on iOS Safari (which doesn't fire the event)
 *
 * Respects user dismissal — won't show again for 30 days after "Not now".
 */

const STORAGE_KEY = 'oyeride_pwa_dismissed';
const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function wasDismissedRecently(): boolean {
  try {
    const ts = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
    return Date.now() - ts < DISMISS_TTL;
  } catch {
    return false;
  }
}

function recordDismissal() {
  try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible]               = useState(false);
  const [iosMode, setIosMode]               = useState(false);

  useEffect(() => {
    // Never show if already installed or dismissed recently
    if (isInStandaloneMode() || wasDismissedRecently()) return;

    // ── iOS Safari path ─────────────────────────────────────────────────
    if (isIOS()) {
      // Delay slightly so it doesn't fight with the splash screen
      const timer = setTimeout(() => {
        setIosMode(true);
        setVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // ── Chrome / Android / Edge path ────────────────────────────────────
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (iosMode) { dismiss(); return; }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setVisible(false);
    recordDismissal();
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={dismiss} style={s.backdrop} />

      {/* Sheet */}
      <div style={s.sheet}>
        {/* Drag handle */}
        <div style={s.handle} />

        {/* Icon + text */}
        <div style={s.row}>
          <img src="/icons/icon-96x96.png" alt="OyeRide" style={s.appIcon} />
          <div style={s.text}>
            <p style={s.title}>Add OyeRide to your home screen</p>
            <p style={s.subtitle}>
              {iosMode
                ? 'Tap the Share button, then “Add to Home Screen” for the full app experience.'
                : 'Install the app for faster access, offline support and ride notifications.'}
            </p>
          </div>
        </div>

        {/* Actions */}
        {!iosMode && (
          <button style={s.installBtn} onClick={handleInstall}>
            Install App
          </button>
        )}
        <button style={s.dismissBtn} onClick={dismiss}>
          {iosMode ? 'Got it' : 'Not now'}
        </button>
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 8000,
    background: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 8001,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '12px 20px 32px',
    boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    background: '#ddd', margin: '0 auto 20px',
  },
  row: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  appIcon: { width: 56, height: 56, borderRadius: 14, flexShrink: 0 },
  text: { flex: 1 },
  title: {
    fontSize: 15, fontWeight: 700, color: '#111',
    fontFamily: "'Poppins', sans-serif", marginBottom: 4,
  },
  subtitle: {
    fontSize: 13, color: '#666', lineHeight: '1.5',
    fontFamily: "'Poppins', sans-serif",
  },
  installBtn: {
    width: '100%', height: 52, borderRadius: 14,
    background: '#061ffa', border: 'none',
    color: '#fff', fontSize: 15, fontWeight: 700,
    fontFamily: "'Poppins', sans-serif",
    cursor: 'pointer', marginBottom: 10,
  },
  dismissBtn: {
    width: '100%', height: 44, borderRadius: 14,
    background: 'transparent', border: 'none',
    color: '#888', fontSize: 14, fontWeight: 500,
    fontFamily: "'Poppins', sans-serif", cursor: 'pointer',
  },
};
