import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon, IconName } from './Icons';

interface Props { open: boolean; onClose: () => void; }

const APK_DIRECT_URL = 'https://github.com/Jehoshaphat12/OyeRide-WebApp/releases/download/v1.0.0-beta/application-70269627-196e-4916-99fe-d72149a62c87.apk'; // optional: direct APK download URL before Play Store listing

const MENU_ITEMS: { icon: IconName; label: string; path: string }[] = [
  { icon: 'home',     label: 'Home',        path: '/' },
  { icon: 'history',  label: 'Ride History',path: '/history' },
  { icon: 'profile',  label: 'Profile',     path: '/profile' },
  { icon: 'help',     label: 'Help Center', path: '/help' },
  { icon: 'phone',    label: 'Contact Us',  path: '/contact' },
  { icon: 'shield',   label: 'Safety',      path: '/safety' },
  { icon: 'settings', label: 'Settings',    path: '/settings' },
];

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleNav = (path: string) => { navigate(path); onClose(); };
  const handleLogout = async () => { await logout(); navigate('/login'); onClose(); };


  // ─── Detection helpers ────────────────────────────────────────────────────────
function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

const handleDownload = () => {
    const url = APK_DIRECT_URL;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {open && <div style={styles.overlay} onClick={onClose} />}
      <div style={{ ...styles.drawer, transform: open ? 'translateX(0)' : 'translateX(-100%)' }}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatar}>
            {user?.photoUrl
              ? <img src={user.photoUrl} alt="avatar" style={styles.avatarImg} />
              : <div style={styles.avatarPlaceholder}>{(user?.name || 'U')[0].toUpperCase()}</div>}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.name || 'OyeRider'}</div>
            <div style={styles.userEmail}>{user?.email || ''}</div>
            <div style={styles.ratingBadge}>
              <Icon name="star-fill" size={11} color="#ffc107" style={{ marginRight: 3 }} />
              {(user?.rating || 0).toFixed(1)}
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <Icon name="close" size={16} color="white" />
          </button>
        </div>

        {/* Menu */}
        <div style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <button key={item.path} style={styles.menuItem} onClick={() => handleNav(item.path)}>
              <Icon name={item.icon} size={20} color="#555" />
              <span style={styles.menuLabel}>{item.label}</span>
              <Icon name="arrow-right" size={16} color="#ccc" />
            </button>
          ))}
        </div>
        {/* CTA buttons */}
        {isAndroid() && 
        <div style={{padding: 16}}>

                <button style={styles.downloadBtn} onClick={handleDownload}>
                  {/* <PlayStoreLogo /> */}
                  <div style={styles.downloadBtnTexts}>
                    <span style={styles.downloadBtnSub}>GET THE MOBILE APP</span>
                    <span style={styles.downloadBtnMain}>Downloa Now!</span>
                  </div>
                  <Icon name="arrow-right" size={18} color="white" />
                </button>
        </div>
        }

        {/* Logout */}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          <Icon name="logout" size={20} color="#f44336" />
          <span style={styles.logoutLabel}>Sign Out</span>
        </button>

        <div style={styles.footer}>
          <span style={styles.footerText}>OyeRide v1.0</span>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 },
  drawer: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '80%', maxWidth: 300,
    background: 'white', zIndex: 900, display: 'flex', flexDirection: 'column',
    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
    // boxShadow: '4px 0 30px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '52px 20px 24px',
    background: 'linear-gradient(135deg, #061ffa, #0215be)', position: 'relative',
  },
  avatar: { flexShrink: 0 },
  avatarImg: { width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid rgba(255,255,255,0.3)' },
  avatarPlaceholder: {
    width: 54, height: 54, borderRadius: '50%', background: 'rgba(255,255,255,0.2)',
    color: 'white', fontSize: 22, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2.5px solid rgba(255,255,255,0.3)',
  },
  userInfo: { flex: 1, overflow: 'hidden' },
  userName: { fontSize: 16, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis' },
  ratingBadge: {
    display: 'inline-flex', alignItems: 'center', marginTop: 6,
    background: 'rgba(255,255,255,0.2)', borderRadius: 20,
    padding: '2px 10px', fontSize: 11, color: 'white', fontWeight: 600,
  },
  closeBtn: {
    position: 'absolute', top: 52, right: 16, width: 32, height: 32, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  menu: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  menuItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    padding: '15px 20px', background: 'transparent', border: 'none',
    cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #f5f5f5',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: 500, color: '#333', fontFamily: "'Poppins', sans-serif" },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '15px 20px', background: 'transparent', border: 'none',
    borderTop: '1px solid #eee', cursor: 'pointer', width: '100%',
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
    fontWeight: 500,
    lineHeight: 1.2,
  },
  logoutLabel: { fontSize: 15, fontWeight: 600, color: '#f44336', fontFamily: "'Poppins', sans-serif" },
  footer: { padding: '12px 20px', borderTop: '1px solid #f0f0f0' },
  footerText: { fontSize: 11, color: '#bbb' },
};
