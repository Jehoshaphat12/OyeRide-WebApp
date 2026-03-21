import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, IconName } from '../components/Icons';

const SAFETY_SECTIONS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'shield',    title: 'Driver Verification',   body: 'Every OyeRide driver undergoes a thorough background check, vehicle inspection, and document verification before being approved. All drivers must maintain a minimum rating to stay on the platform.' },
  { icon: 'location',  title: 'Live Trip Sharing',     body: 'Share your live trip status and real-time location with friends and family. They can follow your journey from pickup to drop-off without needing to install the app.' },
  { icon: 'alert',     title: 'Emergency Assistance',  body: 'Our in-app emergency button connects you directly with local emergency services. You can also quickly share your location with your emergency contacts at any time during a ride.' },
  { icon: 'star',      title: 'Two-Way Ratings',       body: "After every ride, both passengers and drivers rate each other. This keeps the community accountable and helps us quickly identify and remove anyone who doesn't meet our safety standards." },
  { icon: 'lock',      title: 'Data Privacy',          body: 'Your personal data is encrypted and stored securely. We never sell your information to third parties. You have full control over your data and can request deletion at any time.' },
  { icon: 'phone',     title: '24/7 Support',          body: 'Our safety team is available around the clock. If something goes wrong during a ride, you can reach us immediately through the app or via our emergency hotline.' },
];

const TIPS = [
  "Always verify the driver's name, photo, and plate number before getting on",
  'Share your trip details with a trusted contact before you start',
  'Sit behind the driver when possible',
  'Keep your belongings close to you during the ride',
  "Trust your instincts — if something feels wrong, don't hesitate to exit safely",
  'Wear your helmet on motorbike rides',
];

export default function SafetyPage() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <Icon name="arrow-back" size={20} color="white" />
        </button>
        <div>
          <h1 style={s.headerTitle}>Safety & Privacy</h1>
          <p style={s.headerSub}>Your safety is our priority</p>
        </div>
      </div>

      <div style={s.content}>
        {/* Emergency banner */}
        <div style={s.emergencyBanner}>
          <div style={s.emergencyLeft}>
            <div style={s.emergencyIconBox}>
              <Icon name="alert" size={22} color="#f44336" />
            </div>
            <div>
              <div style={s.emergencyTitle}>Emergency?</div>
              <div style={s.emergencySub}>Contact emergency services immediately</div>
            </div>
          </div>
          <a href="tel:112" style={s.emergencyBtn}>Call 112</a>
        </div>

        {/* Safety features */}
        <div style={s.section}>
          <div style={s.sectionTitle}>OUR SAFETY FEATURES</div>
          <div style={s.featuresCard}>
            {SAFETY_SECTIONS.map((sec, i) => {
              const isOpen = openSection === i;
              return (
                <React.Fragment key={i}>
                  {i > 0 && <div style={s.divider} />}
                  <button style={s.featureBtn} onClick={() => setOpenSection(isOpen ? null : i)}>
                    <div style={s.featureIconBox}>
                      <Icon name={sec.icon} size={20} color="#061ffa" />
                    </div>
                    <span style={s.featureTitle}>{sec.title}</span>
                    <div style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                      <Icon name="chevron-down" size={18} color="#aaa" />
                    </div>
                  </button>
                  {isOpen && <div style={s.featureBody}>{sec.body}</div>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Tips */}
        <div style={s.section}>
          <div style={s.sectionTitle}>SAFETY TIPS FOR PASSENGERS</div>
          <div style={s.tipsCard}>
            {TIPS.map((tip, i) => (
              <div key={i} style={s.tipRow}>
                <div style={s.tipNum}>{i + 1}</div>
                <p style={s.tipText}>{tip}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' },
  header: { background: 'linear-gradient(135deg, #061ffa, #0215be)', padding: '52px 20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: 'white' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  emergencyBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff5f5', border: '1.5px solid #ffcccc', borderRadius: 16, padding: '14px 16px', marginBottom: 20 },
  emergencyLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  emergencyIconBox: { width: 44, height: 44, borderRadius: 12, background: '#ffebee', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emergencyTitle: { fontSize: 15, fontWeight: 700, color: '#f44336' },
  emergencySub: { fontSize: 11, color: '#e57373', marginTop: 2 },
  emergencyBtn: { padding: '10px 16px', borderRadius: 12, background: '#f44336', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none', flexShrink: 0 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  featuresCard: { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  divider: { height: 1, background: '#f5f5f5' },
  featureBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' },
  featureIconBox: { width: 36, height: 36, borderRadius: 10, background: '#e8edff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTitle: { flex: 1, fontSize: 14, fontWeight: 600, color: '#333', fontFamily: "'Poppins', sans-serif" },
  featureBody: { padding: '0 16px 16px', fontSize: 13, color: '#666', lineHeight: 1.6 },
  tipsCard: { background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 },
  tipRow: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  tipNum: { width: 28, height: 28, borderRadius: '50%', background: '#e8edff', color: '#061ffa', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  tipText: { fontSize: 13, color: '#555', lineHeight: 1.5, flex: 1 },
};
