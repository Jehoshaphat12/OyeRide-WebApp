import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FirestoreService } from '../services/firestoreService';
import BottomNav from '../components/BottomNav';
import { Icon, IconName } from '../components/Icons';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalRides: 0, totalDistance: 0, rating: 4.9 });
  const [editField, setEditField] = useState<'name' | 'phone' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    FirestoreService.getUserRides(user.id).then((rides) => {
      const done = rides.filter((r) => r.status === 'completed');
      const dist = done.reduce((s, r) => s + (r.distance || 0), 0);
      setStats({ totalRides: done.length, totalDistance: Math.round(dist * 10) / 10, rating: done.length > 0 ? done.reduce((s, r) => s + (r.userRating || 5), 0) / done.length : 4.9 });
    });
  }, [user?.id]);

  const handleSave = async () => {
    if (!editField || !editValue.trim()) return;
    setSaving(true);
    try { await updateProfile({ [editField]: editValue.trim() }); setEditField(null); }
    catch { alert('Failed to update. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to sign out?')) return;
    await logout(); navigate('/login');
  };

  const LINKS: { icon: IconName; label: string; action: () => void }[] = [
    { icon: 'history', label: 'Ride History', action: () => navigate('/history') },
    { icon: 'help',    label: 'Help Center',  action: () => navigate('/help') },
    { icon: 'phone',   label: 'Contact Us',   action: () => navigate('/contact') },
    { icon: 'shield',  label: 'Safety & Privacy', action: () => navigate('/safety') },
  ];

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <div style={s.avatarWrap}>
          {user?.photoUrl
            ? <img src={user.photoUrl} alt="avatar" style={s.avatarImg} />
            : <div style={s.avatarFallback}>{(user?.name || 'U')[0].toUpperCase()}</div>}
        </div>
        <div style={s.headerName}>{user?.name || 'OyeRider'}</div>
        <div style={s.headerEmail}>{user?.email || ''}</div>
        <div style={s.statsRow}>
          <StatCard label="Rides" value={String(stats.totalRides)} />
          <div style={s.statDiv} />
          <StatCard label="km" value={stats.totalDistance.toFixed(1)} />
          <div style={s.statDiv} />
          <StatCard label="Rating" value={stats.rating.toFixed(1)} icon={<Icon name="star-fill" size={12} color="#ffc107" style={{ marginRight: 3 }} />} />
        </div>
      </div>

      <div style={s.content}>
        {editField && (
          <div style={s.editOverlay}>
            <div style={s.editModal}>
              <h3 style={s.editTitle}>Edit {editField === 'name' ? 'Name' : 'Phone'}</h3>
              <input style={s.editInput} autoFocus value={editValue} onChange={(e) => setEditValue(e.target.value)}
                placeholder={editField === 'name' ? 'Your name' : '+233 XX XXX XXXX'} type={editField === 'phone' ? 'tel' : 'text'} />
              <div style={s.editBtns}>
                <button style={s.editCancelBtn} onClick={() => setEditField(null)}>Cancel</button>
                <button style={s.editSaveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}

        <Section title="PERSONAL INFORMATION">
          <ProfileRow icon="profile" label="Full Name" value={user?.name || '—'} onEdit={() => { setEditField('name'); setEditValue(user?.name || ''); }} />
          <Div />
          <ProfileRow icon="mail" label="Email" value={user?.email || '—'} />
          <Div />
          <ProfileRow icon="phone" label="Phone" value={user?.phone || '—'} onEdit={() => { setEditField('phone'); setEditValue(user?.phone || ''); }} />
        </Section>

        <Section title="ACCOUNT">
          {LINKS.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <Div />}
              <button style={s.linkRow} onClick={item.action}>
                <Icon name={item.icon} size={20} color="#555" />
                <span style={s.linkLabel}>{item.label}</span>
                <Icon name="arrow-right" size={16} color="#ccc" />
              </button>
            </React.Fragment>
          ))}
        </Section>

        <button style={s.logoutBtn} onClick={handleLogout}>
          <Icon name="logout" size={18} color="#f44336" style={{ marginRight: 8 }} />
          Sign Out
        </button>
        <div style={{ height: 90 }} />
      </div>
      <BottomNav active="profile" />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}{value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ProfileRow({ icon, label, value, onEdit }: { icon: IconName; label: string; value: string; onEdit?: () => void }) {
  return (
    <div style={s.profileRow}>
      <Icon name={icon} size={20} color="#888" />
      <div style={s.profileTexts}>
        <div style={s.profileLabel}>{label}</div>
        <div style={s.profileValue}>{value}</div>
      </div>
      {onEdit && (
        <button style={s.editBtn} onClick={onEdit}>
          <Icon name="edit" size={17} color="#aaa" />
        </button>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 }}>{title}</div>
      <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>{children}</div>
    </div>
  );
}

const Div = () => <div style={{ height: 1, background: '#f5f5f5', marginLeft: 52 }} />;

const s: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' },
  header: { background: 'linear-gradient(160deg, #061ffa 0%, #0215be 100%)', padding: '52px 20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flexShrink: 0 },
  avatarWrap: { marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.3)' },
  avatarFallback: { width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid rgba(255,255,255,0.3)' },
  headerName: { fontSize: 20, fontWeight: 800, color: 'white' },
  headerEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, marginBottom: 20 },
  statsRow: { display: 'flex', alignItems: 'center', width: '100%', background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '14px 0' },
  statDiv: { width: 1, height: 30, background: 'rgba(255,255,255,0.2)' },
  content: { flex: 1, overflowY: 'auto', padding: '16px 16px 0' },
  profileRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' },
  profileTexts: { flex: 1 },
  profileLabel: { fontSize: 11, color: '#aaa', fontWeight: 600 },
  profileValue: { fontSize: 14, color: '#333', fontWeight: 500, marginTop: 2 },
  editBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 },
  linkRow: { width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '15px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: 500, color: '#333', fontFamily: "'Poppins', sans-serif" },
  logoutBtn: { width: '100%', padding: '14px', background: '#fff0f0', border: '1px solid #ffcccc', color: '#f44336', fontSize: 14, fontWeight: 700, borderRadius: 14, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  editOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  editModal: { background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  editTitle: { fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 16 },
  editInput: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: "'Poppins', sans-serif", outline: 'none', marginBottom: 16, color: '#333' },
  editBtns: { display: 'flex', gap: 10 },
  editCancelBtn: { flex: 1, padding: '12px', borderRadius: 12, background: '#f0f0f0', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", color: '#555' },
  editSaveBtn: { flex: 1, padding: '12px', borderRadius: 12, background: '#061ffa', border: 'none', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" },
};
