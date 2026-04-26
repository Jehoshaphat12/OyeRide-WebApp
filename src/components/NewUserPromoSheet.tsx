import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

interface Props {
  visible: boolean;
  onBookNow: () => void;
  onClose: () => void;
}

export default function NewUserPromoSheet({ visible, onBookNow, onClose }: Props) {
  const [rendered, setRendered] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number>(0);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)));
    } else {
      setAnimIn(false);
      const t = setTimeout(() => setRendered(false), 380);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // ── Swipe-down to dismiss ───────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && sheetRef.current) {
      currentYRef.current = delta;
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };
  const handleTouchEnd = () => {
    if (currentYRef.current > 100) {
      onClose();
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
    startYRef.current = null;
    currentYRef.current = 0;
  };

  if (!rendered) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0, zIndex: 700,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(3px)',
          opacity: animIn ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 701,
          background: 'white', borderRadius: '24px 24px 0 0',
          padding: '0 0 max(28px,env(safe-area-inset-bottom,28px))',
          transform: animIn ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 0.42s cubic-bezier(0.34,1.28,0.64,1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.22)',
          touchAction: 'pan-y',
        }}
      >
        {/* Handle */}
        <div style={{ width: 44, height: 4, borderRadius: 2, background: '#ddd', margin: '12px auto 0' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 20,
            width: 32, height: 32, borderRadius: '50%', background: '#f0f0f0',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="close" size={14} color="#888" strokeWidth={2.5} />
        </button>

        {/* Confetti / promo art */}
        

        {/* Headline */}
        <div style={{ padding: '20px 28px 0', textAlign: 'center' }}>
          <div style={{
          margin: '20px auto 0',
          width: 96, height: 96, borderRadius: '50%',
          // background: 'linear-gradient(135deg,#061ffa 0%,#394cfc 60%,#ff7300 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          // boxShadow: '0 8px 30px rgba(6,31,250,0.35)',
          position: 'relative',
        }}>
          {/* Percent badge */}
          <span style={{ fontSize: 56, fontWeight: 700, color: 'blue', fontFamily: "'Poppins',sans-serif", letterSpacing: -1 }}>10%</span>
          <span style={{ fontSize: 25, fontWeight: 700, color: '#111', fontFamily: "'Poppins',sans-serif", letterSpacing: -1 }}>OFF</span>
          
        </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#111', fontFamily: "'Poppins',sans-serif", lineHeight: 1.2, marginBottom: 6 }}>
            On Your First 2 Rides!
          </div>
          <div style={{ fontSize: 14, color: '#666', fontFamily: "'Poppins',sans-serif", lineHeight: 1.6, marginBottom: 20 }}>
            Welcome to OyeRide!<br />
            Enjoy <strong>10% discount</strong> on your
            first two <br />completed rides.
          </div>

          {/* Promo highlights */}
          {[
            { icon: 'check-circle' as const, color: '#4caf50', text: 'Auto-applied at checkout — no code needed' },
            { icon: 'star-fill' as const,    color: '#ff9800', text: 'Valid for your first 2 completed rides' },
            { icon: 'clock' as const,        color: '#061ffa', text: 'Available now — book anytime' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, textAlign: 'left' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: item.color + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={item.icon} size={17} color={item.color} />
              </div>
              <span style={{ fontSize: 13, color: '#444', fontFamily: "'Poppins',sans-serif", lineHeight: 1.4 }}>{item.text}</span>
            </div>
          ))}

          {/* Promo badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg,#e8edff,#f0f4ff)',
            border: '1.5px solid #c5d0ff',
            borderRadius: 20, padding: '8px 18px', marginBottom: 22, marginTop: 4,
          }}>
            <Icon name="star-fill" size={14} color="#061ffa" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#061ffa', fontFamily: "'Poppins',sans-serif" }}>
              NEW RIDER PROMO · 10% OFF × 2
            </span>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '0 28px' }}>
          <button
            onClick={onBookNow}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg,#061ffa,#394cfc)',
              color: 'white', borderRadius: 18, fontSize: 16, fontWeight: 700,
              border: 'none', cursor: 'pointer', fontFamily: "'Poppins',sans-serif",
              letterSpacing: 0.3, boxShadow: '0 6px 24px rgba(6,31,250,0.4)',
            }}
          >
            BOOK NOW 
          </button>
        </div>
      </div>
    </>
  );
}
