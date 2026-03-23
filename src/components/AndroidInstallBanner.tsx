import React, { useEffect, useState } from 'react';
import { Icon } from './Icons';

// ─── Config — update these when you publish to Play Store ────────────────────
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.jehoshaphat12.oyeride';
const APK_DIRECT_URL = 'https://github.com/Jehoshaphat12/OyeRide-WebApp/releases/download/v1.0.0-beta/application-70269627-196e-4916-99fe-d72149a62c87.apk'; // optional: direct APK download URL before Play Store listing

const STORAGE_KEY = 'oyeride_android_banner_dismissed';
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// ─── Detection helpers ────────────────────────────────────────────────────────
function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  // Already running as installed PWA — don't show the banner
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function saveDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {}
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AndroidInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Only show on Android, not when already installed, not if dismissed recently
    if (!isAndroid() || isStandalone() || isDismissedRecently()) return;

    // Small delay so it doesn't feel instant/jarring
    const timer = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    saveDismissed();
    setExiting(true);
    setTimeout(() => setVisible(false), 350);
  };

  const handleDownload = () => {
    const url = APK_DIRECT_URL;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <>
      {/* Dim overlay */}
      <div
        style={{
          ...s.overlay,
          opacity: animating && !exiting ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}
        onClick={handleDismiss}
      />

      {/* Bottom sheet popup */}
      <div
        style={{
          ...s.sheet,
          transform: animating && !exiting ? 'translateY(0)' : 'translateY(110%)',
          transition: exiting
            ? 'transform 0.32s cubic-bezier(0.4,0,1,1)'
            : 'transform 0.42s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Drag handle */}
        <div style={s.handle} />

        {/* Close button */}
        <button style={s.closeBtn} onClick={handleDismiss} aria-label="Dismiss">
          <Icon name="close" size={16} color="#888" strokeWidth={2.5} />
        </button>

        {/* App icon + branding */}
        <div style={s.appRow}>
          <div style={s.appIcon}>
            {/* OyeRide logo mark */}
            {/* <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
              <path d="M12 27c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
              <circle cx="22" cy="16" r="4" fill="white" />
              <path d="M17 32l5-5 5 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg> */}
            <span style={{fontWeight: 700, color: "#fff"}}>Oye</span>
          </div>
          <div style={s.appInfo}>
            <div style={s.appName}>OyeRide</div>
            <div style={s.appPublisher}>Rant Technologies</div>
            <div style={s.appRating}>
              {[1,2,3,4,5].map((i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="#ffc107" style={{ marginRight: 1 }}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              <span style={s.ratingText}>4.8</span>
            </div>
          </div>
          <div style={s.freeBadge}>FREE</div>
        </div>

        {/* Headline */}
        <div style={s.headline}>Get the full experience on Android</div>

        {/* Benefits list */}
        <div style={s.benefits}>
          {[
            { icon: 'bell' as const,      text: 'Instant push notifications when your driver arrives' },
            { icon: 'navigation' as const, text: 'Live GPS tracking with real-time driver location' },
            { icon: 'motorcycle' as const, text: 'Faster booking & smoother ride experience' },
            // { icon: 'star-fill' as const,  text: 'Exclusive in-app offers and promo codes' },
          ].map((b, i) => (
            <div key={i} style={s.benefit}>
              <div style={s.benefitIcon}>
                <Icon name={b.icon} size={17} color="#061ffa" strokeWidth={1.75} />
              </div>
              <span style={s.benefitText}>{b.text}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <button style={s.downloadBtn} onClick={handleDownload}>
          {/* <PlayStoreLogo /> */}
          <div style={s.downloadBtnTexts}>
            <span style={s.downloadBtnSub}>GET IT ON</span>
            <span style={s.downloadBtnMain}>Download Now!</span>
          </div>
          <Icon name="arrow-right" size={18} color="white" />
        </button>

        <button style={s.continueBtn} onClick={handleDismiss}>
          Continue in browser instead
        </button>
      </div>
    </>
  );
}

// Play Store logo SVG
function PlayStoreLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path d="M3.18 23.76c.28.15.6.19.92.1l11.82-6.84-2.82-2.82-9.92 9.56Z" fill="#EA4335" />
      <path d="M20.54 10.16 17.7 8.5l-3.18 3.18 3.18 3.18 2.88-1.66a1.83 1.83 0 0 0 0-3.04Z" fill="#FBBC04" />
      <path d="M3.18.24A1.84 1.84 0 0 0 2 1.92v20.16c0 .68.38 1.28.96 1.6L13.7 12 3.18.24Z" fill="#4285F4" />
      <path d="M3.18.24 14.52 11.6l-2.82 2.82L3.18.24Z" fill="#34A853" />
      <path d="M14.52 11.6 3.18.24l-.01-.01c.3-.14.65-.17.99-.07L14.88 6.82l-2.88 2.88 2.52 1.9Z" fill="#34A853" opacity=".4" />
    </svg>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    zIndex: 3000,
    backdropFilter: 'blur(2px)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '24px 24px 0 0',
    padding: '8px 24px 40px',
    zIndex: 3001,
    boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: '#ddd',
    margin: '8px auto 20px',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#f0f0f0',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // App identity row
  appRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottom: '1px solid #f0f0f0',
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 14px rgba(6,31,250,0.35)',
  },
  appInfo: { flex: 1 },
  appName: {
    fontSize: 18,
    fontWeight: 800,
    color: '#111',
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.2,
  },
  appPublisher: {
    fontSize: 12,
    color: '#888',
    fontFamily: "'Poppins', sans-serif",
    marginTop: 2,
  },
  appRating: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 12,
    color: '#555',
    fontWeight: 600,
    marginLeft: 4,
    fontFamily: "'Poppins', sans-serif",
  },
  freeBadge: {
    padding: '5px 12px',
    background: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 800,
    fontFamily: "'Poppins', sans-serif",
    flexShrink: 0,
  },
  // Headline
  headline: {
    fontSize: 20,
    fontWeight: 800,
    color: '#111',
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.3,
    marginBottom: 16,
  },
  // Benefits
  benefits: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
  },
  benefit: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    background: '#e8edff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: {
    fontSize: 13,
    color: '#444',
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.5,
    paddingTop: 6,
  },
  // Download button
  downloadBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 20px',
    background: '#000',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    marginBottom: 12,
    boxShadow: '0 4px 18px rgba(0,0,0,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  downloadBtnTexts: {
    flex: 1,
    textAlign: 'left',
  },
  downloadBtnSub: {
    display: 'block',
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: 1,
    fontWeight: 500,
  },
  downloadBtnMain: {
    display: 'block',
    fontSize: 18,
    color: 'white',
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  // Continue in browser
  continueBtn: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: 'none',
    color: '#999',
    fontSize: 13,
    fontFamily: "'Poppins', sans-serif",
    cursor: 'pointer',
    textDecoration: 'underline',
    textDecorationColor: '#ddd',
  },
};
