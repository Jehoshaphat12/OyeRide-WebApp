import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ride, RideState } from '../types';
import { Icon } from './Icons';

interface Props {
  rideState: RideState;
  ride: Ride | null;
  driverInfo: any;
  onCancel: () => void;
}

const STATE_INFO: Record<string, { title: string; subtitle: string; color: string }> = {
  searching:       { title: 'Finding your driver...', subtitle: "We're connecting you with a nearby driver", color: '#061ffa' },
  driver_assigned: { title: 'Driver on the way!',     subtitle: 'Your driver is heading to your pickup',   color: '#4caf50' },
  en_route:        { title: 'Enjoy your ride!',        subtitle: "You're on your way to the destination",   color: '#ff7300' },
};

export default function RideTrackingSheet({ rideState, ride, driverInfo, onCancel }: Props) {
  const navigate = useNavigate();
  const [searchTime, setSearchTime] = useState(0);
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (rideState !== 'searching') return;
    const t = setInterval(() => setSearchTime((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [rideState]);

  useEffect(() => {
    if (rideState !== 'searching') return;
    const p = setInterval(() => setPulseScale((s) => s === 1 ? 1.2 : 1), 700);
    return () => clearInterval(p);
  }, [rideState]);

  const info = STATE_INFO[rideState] || STATE_INFO.searching;
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(Math.floor(searchTime / 60))}:${pad(searchTime % 60)}`;

  return (
    <div style={styles.sheet}>
      <div style={styles.handle} />

      {rideState === 'searching' && (
        <div style={styles.searchingSection}>
          <div style={styles.pulseRings}>
            <div style={{ ...styles.ring, ...styles.ring3 }} />
            <div style={{ ...styles.ring, ...styles.ring2 }} />
            <div style={{ ...styles.ring, ...styles.ring1 }} />
            <div style={{ ...styles.pulseCenter, transform: `scale(${pulseScale})` }}>
              <Icon name="motorcycle" size={28} color="white" strokeWidth={1.5} />
            </div>
          </div>
          <h3 style={styles.stateTitle}>{info.title}</h3>
          <p style={styles.stateSub}>{info.subtitle}</p>
          <div style={styles.timer}>{timeStr}</div>
          <button style={styles.cancelBtn} onClick={onCancel}>
            <Icon name="cancel" size={16} color="#f44336" style={{ marginRight: 6 }} />
            Cancel Ride
          </button>
        </div>
      )}

      {(rideState === 'driver_assigned' || rideState === 'en_route') && driverInfo && (
        <div style={styles.driverSection}>
          <div style={styles.statusBanner}>
            <div style={{ ...styles.statusDot, background: info.color }} />
            <span style={styles.statusLabel}>{info.title}</span>
          </div>

          <div style={styles.driverCard}>
            <div style={styles.driverAvatarWrap}>
              {driverInfo.photoUrl
                ? <img src={driverInfo.photoUrl} alt="driver" style={styles.avatarImg} />
                : <div style={styles.avatarFallback}>{(driverInfo.name || 'D')[0].toUpperCase()}</div>}
              <div style={styles.onlineDot} />
            </div>
            <div style={styles.driverInfo}>
              <div style={styles.driverName}>{driverInfo.name || 'Your Driver'}</div>
              <div style={styles.driverRating}>
                <Icon name="star-fill" size={12} color="#ffc107" style={{ marginRight: 3 }} />
                {(driverInfo.rating || 4.8).toFixed(1)} · {driverInfo.totalTrips || 0} trips
              </div>
              <div style={styles.vehicleTag}>
                <Icon name="motorcycle" size={13} color="#555" style={{ marginRight: 4 }} />
                {driverInfo.vehicle?.vehicleModel || 'Motorbike'} ·{' '}
                <span style={styles.plate}>{driverInfo.vehicle?.vehicleNumber || 'GR-1234'}</span>
              </div>
            </div>
            <div style={styles.etaBadge}>
              <span style={styles.etaText}>{rideState === 'driver_assigned' ? (driverInfo.eta || '5 min') : 'Active'}</span>
              <span style={styles.etaLabel}>{rideState === 'driver_assigned' ? 'ETA' : 'Status'}</span>
            </div>
          </div>

          {/* Contact options */}
          <div style={styles.contactRow}>
            <a href={`tel:${driverInfo.phone}`} style={styles.contactBtn}>
              <div style={{ ...styles.contactIconBox, background: '#e8f5e9' }}>
                <Icon name="phone" size={18} color="#4caf50" strokeWidth={1.75} />
              </div>
              <span style={styles.contactLabel}>Call</span>
            </a>
            <a href={`sms:${driverInfo.phone}`} style={styles.contactBtn}>
              <div style={{ ...styles.contactIconBox, background: '#e3f2fd' }}>
                <Icon name="mail" size={18} color="#2196f3" strokeWidth={1.75} />
              </div>
              <span style={styles.contactLabel}>SMS</span>
            </a>
            <a href={`https://wa.me/${driverInfo.phone?.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={styles.contactBtn}>
              <div style={{ ...styles.contactIconBox, background: '#e8f5e9' }}>
                <Icon name="whatsapp" size={18} color="#25d366" />
              </div>
              <span style={styles.contactLabel}>WhatsApp</span>
            </a>
            {ride?.id && (
              <button
                style={{ ...styles.contactBtn, background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => navigate(`/chat?rideId=${ride.id}&driverId=${ride.driverId || ''}&driverName=${encodeURIComponent(driverInfo.name || 'Driver')}`)}
              >
                <div style={{ ...styles.contactIconBox, background: '#e8edff' }}>
                  <Icon name="chat" size={18} color="#061ffa" strokeWidth={1.75} />
                </div>
                <span style={{ ...styles.contactLabel, color: '#061ffa' }}>Chat</span>
              </button>
            )}
          </div>

          {ride && (
            <div style={styles.fareRow}>
              <div style={styles.fareLeft}>
                <Icon name="cash" size={16} color="#888" style={{ marginRight: 8 }} />
                <span style={styles.fareLabel}>Total Fare</span>
              </div>
              <span style={styles.fareValue}>GH₵ {(Math.round(ride.totalFare) || 0)}</span>
            </div>
          )}

          {rideState === 'driver_assigned' && (
            <button style={styles.cancelBtnSmall} onClick={onCancel}>
              <Icon name="cancel" size={15} color="#f44336" style={{ marginRight: 6 }} />
              Cancel Ride
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white',
    borderRadius: '24px 24px 0 0', padding: '12px 20px 36px',
    boxShadow: '0 -4px 30px rgba(0,0,0,0.18)', zIndex: 300, animation: 'slideUp 0.35s ease',
  },
  handle: { width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '0 auto 20px' },
  searchingSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 8 },
  pulseRings: {
    position: 'relative', width: 120, height: 120,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  ring: { position: 'absolute', borderRadius: '50%', border: '2px solid', animation: 'ripple 2s ease-out infinite' },
  ring1: { width: 80, height: 80, borderColor: 'rgba(6,31,250,0.4)', animationDelay: '0s' },
  ring2: { width: 100, height: 100, borderColor: 'rgba(6,31,250,0.25)', animationDelay: '0.5s' },
  ring3: { width: 120, height: 120, borderColor: 'rgba(6,31,250,0.12)', animationDelay: '1s' },
  pulseCenter: {
    width: 56, height: 56, borderRadius: '50%', background: '#061ffa',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
    transition: 'transform 0.3s ease', boxShadow: '0 4px 20px rgba(6,31,250,0.4)',
  },
  stateTitle: { fontSize: 18, fontWeight: 700, color: '#333', textAlign: 'center' },
  stateSub: { fontSize: 13, color: '#888', textAlign: 'center' },
  timer: { fontSize: 28, fontWeight: 800, color: '#061ffa', letterSpacing: 2, fontVariantNumeric: 'tabular-nums' },
  cancelBtn: {
    marginTop: 8, padding: '12px 32px', borderRadius: 12,
    background: '#fff0f0', border: '1px solid #ffcccc', color: '#f44336',
    fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    display: 'flex', alignItems: 'center',
  },
  driverSection: { display: 'flex', flexDirection: 'column', gap: 14 },
  statusBanner: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8f8f8', borderRadius: 12 },
  statusDot: { width: 10, height: 10, borderRadius: '50%' },
  statusLabel: { fontSize: 14, fontWeight: 600, color: '#333' },
  driverCard: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '16px',
    background: '#fafafa', borderRadius: 16, border: '1px solid #eee',
  },
  driverAvatarWrap: { position: 'relative', flexShrink: 0 },
  avatarImg: { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' },
  avatarFallback: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white', fontSize: 22, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2, width: 14, height: 14,
    borderRadius: '50%', background: '#4caf50', border: '2px solid white',
  },
  driverInfo: { flex: 1, overflow: 'hidden' },
  driverName: { fontSize: 15, fontWeight: 700, color: '#333' },
  driverRating: { fontSize: 12, color: '#888', marginTop: 2, display: 'flex', alignItems: 'center' },
  vehicleTag: { fontSize: 12, color: '#555', marginTop: 4, display: 'flex', alignItems: 'center' },
  plate: { fontWeight: 700, color: '#061ffa' },
  etaBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '8px 12px', background: '#e8edff', borderRadius: 12, flexShrink: 0,
  },
  etaText: { fontSize: 15, fontWeight: 800, color: '#061ffa' },
  etaLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  contactRow: { display: 'flex', gap: 8 },
  contactBtn: {
    flex: 1, padding: '10px 6px', background: '#f9f9f9', borderRadius: 12,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, textDecoration: 'none',
  },
  contactIconBox: {
    width: 40, height: 40, borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  contactLabel: { fontSize: 11, fontWeight: 600, color: '#555', fontFamily: "'Poppins', sans-serif" },
  fareRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: '#f7f7f7', borderRadius: 12,
  },
  fareLeft: { display: 'flex', alignItems: 'center' },
  fareLabel: { fontSize: 13, color: '#888' },
  fareValue: { fontSize: 17, fontWeight: 800, color: '#061ffa' },
  cancelBtnSmall: {
    padding: '12px', borderRadius: 12, background: '#fff0f0', border: '1px solid #ffcccc',
    color: '#f44336', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif", width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
