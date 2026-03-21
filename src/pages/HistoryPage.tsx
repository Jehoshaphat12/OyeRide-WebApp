import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FirestoreService } from '../services/firestoreService';
import { Ride } from '../types';
import BottomNav from '../components/BottomNav';
import { Icon } from '@/components/Icons';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completed', color: '#4caf50', bg: '#f0fff4' },
  cancelled: { label: 'Cancelled', color: '#f44336', bg: '#fff5f5' },
  in_progress: { label: 'In Progress', color: '#ff7300', bg: '#fff8f0' },
  requesting: { label: 'Requesting', color: '#2196f3', bg: '#e3f2fd' },
  accepted: { label: 'Accepted', color: '#2196f3', bg: '#e3f2fd' },
};

const VEHICLE_LABELS: Record<string, string> = {
  motor: '🛵 OyeRide',
  delivery: '📦 OyeDeliver',
  bicycle_delivery: '🚲 OyeBicycle',
};

export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    FirestoreService.getUserRides(user.id)
      .then(setRides)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = rides.filter((r) => filter === 'all' || r.status === filter);

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div>
          <h1 style={styles.headerTitle}>Ride History</h1>
          <p style={styles.headerSub}>{rides.length} total rides</p>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterRow}>
        {(['all', 'completed', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={styles.list}>
        {loading && (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>Loading rides...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>🛵</div>
            <h3 style={styles.emptyTitle}>No rides yet</h3>
            <p style={styles.emptySub}>Your ride history will appear here</p>
            <button style={styles.bookBtn} onClick={() => navigate('/')}>Book a Ride</button>
          </div>
        )}

        {!loading && filtered.map((ride) => {
          const statusCfg = STATUS_CONFIG[ride.status] || { label: ride.status, color: '#888', bg: '#f5f5f5' };
          const isExpanded = expandedId === ride.id;
          const dest = ride.destinations?.[0];

          return (
            <div key={ride.id} style={styles.rideCard}>
              <button style={styles.rideCardInner} onClick={() => setExpandedId(isExpanded ? null : ride.id)}>
                <div style={styles.rideLeft}>
                  <div style={styles.vehicleIconBox}>
                    <span style={{ fontSize: 24 }}>
                      <Icon size={22} name='history' color='gray'/>
                    </span>
                  </div>
                  <div style={styles.rideInfo}>
                    <div style={styles.vehicleName}>{VEHICLE_LABELS[ride.vehicleType] || ride.vehicleType}</div>
                    <div style={styles.rideDate}>{formatDate(ride.requestedAt)} · {formatTime(ride.requestedAt)}</div>
                    <div style={styles.rideRoute}>
                      <span style={styles.routeFrom}>{ride.pickup?.address?.slice(0, 30) || '—'}</span>
                      <span style={styles.routeArrow}>→</span>
                      <span style={styles.routeTo}>{dest?.address?.slice(0, 30) || '—'}</span>
                    </div>
                  </div>
                </div>
                <div style={styles.rideRight}>
                  <div style={{ ...styles.statusBadge, color: statusCfg.color, background: statusCfg.bg }}>
                    {statusCfg.label}
                  </div>
                  <div style={styles.ridePrice}>GH₵ {(Math.round((ride.totalFare)) || 0)}</div>
                </div>
              </button>

              {isExpanded && (
                <div style={styles.rideDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>Distance</span>
                    <span style={styles.detailVal}>{ride.distance?.toFixed(1) || '—'} km</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailKey}>Duration</span>
                    <span style={styles.detailVal}>{Math.round(ride.duration || 0)} min</span>
                  </div>
                  {ride.userRating && (
                    <div style={styles.detailRow}>
                      <div style={styles.detailLeft}>
                        <Icon name="star-fill" size={14} color="#ffc107" style={{ marginRight: 6 }} />
                        <span style={styles.detailKey}>Your Rating</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Icon key={i} name={i < (ride.userRating ?? 0) ? 'star-fill' : 'star'} size={13} color="#ffc107" />
                        ))}
                      </div>
                    </div>
                  )}
                  {ride.status === 'completed' && (
                    <button style={styles.rebookBtn} onClick={() => navigate('/')}>
                      Book Similar Ride
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav active="history" />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' },
  header: {
    background: 'linear-gradient(135deg, #061ffa, #0215be)',
    padding: '52px 20px 24px',
    display: 'flex', alignItems: 'center', gap: 16,
    flexShrink: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(255,255,255,0.15)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  headerTitle: { fontSize: 20, fontWeight: 700, color: 'white' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  filterRow: {
    display: 'flex', gap: 8, padding: '14px 20px',
    background: 'white', borderBottom: '1px solid #eee', flexShrink: 0,
  },
  filterBtn: {
    padding: '8px 16px', borderRadius: 20,
    border: '1.5px solid #eee', background: 'transparent',
    fontSize: 13, fontWeight: 600, color: '#888',
    cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    transition: 'all 0.15s',
  },
  filterBtnActive: { border: '1.5px solid #061ffa', background: '#e8edff', color: '#061ffa' },
  list: { flex: 1, overflowY: 'auto', padding: '12px 16px 80px', display: 'flex', flexDirection: 'column', gap: 10 },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 12 },
  spinner: {
    width: 36, height: 36, border: '3px solid #eee',
    borderTop: '3px solid #061ffa', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: { color: '#888', fontSize: 14 },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 10 },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: '#333' },
  emptySub: { fontSize: 14, color: '#888' },
  bookBtn: {
    marginTop: 8, padding: '12px 28px', borderRadius: 14,
    background: '#061ffa', color: 'white', border: 'none',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
  },
  rideCard: { background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  rideCardInner: {
    width: '100%', display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', padding: '14px 16px',
    background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
    gap: 12,
  },
  rideLeft: { display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, overflow: 'hidden' },
  vehicleIconBox: {
    width: 48, height: 48, borderRadius: 14,
    background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rideInfo: { flex: 1, overflow: 'hidden' },
  vehicleName: { fontSize: 14, fontWeight: 700, color: '#333' },
  rideDate: { fontSize: 11, color: '#aaa', marginTop: 2 },
  rideRoute: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'nowrap', overflow: 'hidden' },
  routeFrom: { fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 },
  routeArrow: { fontSize: 11, color: '#aaa', flexShrink: 0 },
  routeTo: { fontSize: 11, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 },
  rideRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  statusBadge: { padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700 },
  ridePrice: { fontSize: 15, fontWeight: 800, color: '#333' },
  rideDetails: { padding: '0 16px 16px', borderTop: '1px solid #f5f5f5', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 0 },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  detailKey: { fontSize: 13, color: '#888' },
  detailVal: { fontSize: 13, fontWeight: 600, color: '#333' },
  rebookBtn: {
    marginTop: 8, padding: '10px', borderRadius: 12,
    background: '#f0f4ff', border: '1px solid #d0dbff',
    color: '#061ffa', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Poppins', sans-serif", width: '100%',
  },
};
