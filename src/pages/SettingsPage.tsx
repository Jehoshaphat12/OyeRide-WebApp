import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { Icon, IconName } from '../components/Icons';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetEmail, setResetEmail] = useState(user?.email || '');
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async () => {
    if (!resetEmail) return;
    try { await AuthService.resetPassword(resetEmail); setResetSent(true); }
    catch { alert('Failed to send reset email. Please try again.'); }
  };

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <Icon name="arrow-back" size={20} color="white" />
        </button>
        <h1 style={s.headerTitle}>Settings</h1>
      </div>

      <div style={s.content}>
        <Section title="NOTIFICATIONS">
          <Toggle icon="bell" label="Push Notifications" desc="Ride updates, driver arrival alerts" checked={notifications} onChange={setNotifications} />
          <div style={s.div} />
          <Toggle icon="location" label="Location Access" desc="Required for pickup & tracking" checked={locationTracking} onChange={setLocationTracking} />
        </Section>

        <Section title="APPEARANCE">
          <Toggle icon="moon" label="Dark Mode" desc="Easier on the eyes at night" checked={darkMode} onChange={setDarkMode} />
        </Section>

        <Section title="ACCOUNT">
          <SettingRow icon="key"      label="Change Password"   onPress={() => setShowPasswordModal(true)} />
          <div style={s.div} />
          <SettingRow icon="document" label="Privacy Policy"    onPress={() => {}} />
          <div style={s.div} />
          <SettingRow icon="document" label="Terms of Service"  onPress={() => {}} />
          <div style={s.div} />
          <SettingRow icon="info"     label="App Version"       value="1.0.0" />
        </Section>

        <Section title="DANGER ZONE">
          <button style={s.dangerBtn} onClick={() => setShowDeleteModal(true)}>
            <Icon name="trash" size={20} color="#f44336" />
            <span style={s.dangerLabel}>Delete Account</span>
          </button>
        </Section>

        <div style={{ height: 40 }} />
      </div>

      {showPasswordModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            {resetSent ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Icon name="check-circle" size={48} color="#4caf50" />
                </div>
                <h3 style={s.modalTitle}>Email Sent!</h3>
                <p style={s.modalText}>Check your inbox for the password reset link.</p>
                <button style={s.modalPrimBtn} onClick={() => { setShowPasswordModal(false); setResetSent(false); }}>Done</button>
              </>
            ) : (
              <>
                <h3 style={s.modalTitle}>Reset Password</h3>
                <p style={s.modalText}>We'll send a reset link to your email.</p>
                <input style={s.modalInput} value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} type="email" />
                <div style={s.modalBtns}>
                  <button style={s.modalCancelBtn} onClick={() => setShowPasswordModal(false)}>Cancel</button>
                  <button style={s.modalPrimBtn} onClick={handlePasswordReset}>Send Link</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <Icon name="warning" size={48} color="#ff9800" />
            </div>
            <h3 style={s.modalTitle}>Delete Account?</h3>
            <p style={s.modalText}>This action is permanent and cannot be undone. All your ride history and data will be deleted.</p>
            <div style={s.modalBtns}>
              <button style={s.modalCancelBtn} onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button style={{ ...s.modalPrimBtn, background: '#f44336', boxShadow: 'none' }} onClick={() => { alert('To delete your account, contact support@oyeride.com'); setShowDeleteModal(false); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{title}</div>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{children}</div>
    </div>
  );
}

function Toggle({ icon, label, desc, checked, onChange }: { icon: IconName; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <Icon name={icon} size={20} color="#555" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!checked)} style={{ width: 50, height: 28, borderRadius: 14, background: checked ? '#061ffa' : '#ddd', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.25s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 25 : 3, width: 22, height: 22, borderRadius: '50%', background: 'white', transition: 'left 0.25s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

function SettingRow({ icon, label, onPress, value }: { icon: IconName; label: string; onPress?: () => void; value?: string }) {
  return (
    <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: 'transparent', border: 'none', cursor: onPress ? 'pointer' : 'default', textAlign: 'left' }} onClick={onPress}>
      <Icon name={icon} size={20} color="#555" />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: '#333', fontFamily: "'Poppins', sans-serif" }}>{label}</span>
      {value ? <span style={{ fontSize: 13, color: '#aaa' }}>{value}</span> : onPress ? <Icon name="arrow-right" size={16} color="#ccc" /> : null}
    </button>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' },
  header: { background: 'linear-gradient(135deg, #061ffa, #0215be)', padding: '52px 20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: 'white' },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  div: { height: 1, background: '#f5f5f5', marginLeft: 50 },
  dangerBtn: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: 'transparent', border: 'none', cursor: 'pointer' },
  dangerLabel: { fontSize: 14, fontWeight: 600, color: '#f44336', fontFamily: "'Poppins', sans-serif" },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 8, textAlign: 'center' },
  modalText: { fontSize: 13, color: '#888', lineHeight: 1.5, marginBottom: 16, textAlign: 'center' },
  modalInput: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: "'Poppins', sans-serif", outline: 'none', marginBottom: 16, color: '#333' },
  modalBtns: { display: 'flex', gap: 10 },
  modalCancelBtn: { flex: 1, padding: '12px', borderRadius: 12, background: '#f0f0f0', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", color: '#555' },
  modalPrimBtn: { flex: 1, padding: '12px', borderRadius: 12, background: '#061ffa', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", boxShadow: '0 4px 12px rgba(6,31,250,0.3)' },
};
