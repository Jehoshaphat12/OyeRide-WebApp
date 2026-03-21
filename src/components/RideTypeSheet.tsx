import React, { useState, useEffect, useMemo } from 'react';
import { VehicleType, calculateFare, calculateSurgeMultiplier, SurgeInfo } from '../lib/fareCalculator';
import { Icon } from './Icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../lib/firebase';

export interface RideOption {
  id: string;
  type: VehicleType;
  title: string;
  image: string;
  totalPrice: number;
  eta: string;
  nearbyDrivers: number;
  disabled: boolean;
  surgeInfo: SurgeInfo;
}

interface Props {
  routeData: { distance: number; duration: number };
  pickup: { latitude: number; longitude: number; address: string } | null;
  destination: { latitude: number; longitude: number; address: string } | null;
  onSelect: (ride: RideOption) => void;
  onCancel: () => void;
  onEditLocations: () => void;
}

async function fetchDriverCount(lat: number, lng: number, type: VehicleType): Promise<number> {
  try {
    const q = query(
      collection(firestore, 'drivers'),
      where('isAvailable', '==', true),
      where('isOnline', '==', true),
    );
    const snap = await getDocs(q);
    let count = 0;
    snap.forEach((doc) => {
      const d = doc.data();
      const vt = d.vehicle?.vehicleType;
      const targetType = type === 'bicycle_delivery' ? 'delivery' : type;
      if (vt !== targetType) return;
      if (d.currentLocation) {
        const dlat = d.currentLocation.latitude - lat;
        const dlng = d.currentLocation.longitude - lng;
        const distKm = Math.sqrt(dlat * dlat + dlng * dlng) * 111;
        if (distKm <= 5) count++;
      }
    });
    return count;
  } catch { return 0; }
}

async function fetchActiveRequestCount(): Promise<number> {
  try {
    const q = query(collection(firestore, 'rides'), where('status', '==', 'requesting'));
    const snap = await getDocs(q);
    return snap.size;
  } catch { return 0; }
}

export default function RideTypeSheet({ routeData, pickup, destination, onSelect, onCancel, onEditLocations }: Props) {
  const [selectedId, setSelectedId] = useState('1');
  const [driverCounts, setDriverCounts] = useState({ motor: 0, delivery: 0, bicycle_delivery: 0 });
  const [countsLoading, setCountsLoading] = useState(false);
  const [surgeInfo, setSurgeInfo] = useState<SurgeInfo>({ multiplier: 1, reason: 'Normal pricing', label: 'Normal', isActive: false });

  useEffect(() => {
    if (!pickup?.latitude) return;
    setCountsLoading(true);
    Promise.all([
      fetchDriverCount(pickup.latitude, pickup.longitude, 'motor'),
      fetchDriverCount(pickup.latitude, pickup.longitude, 'delivery'),
      fetchDriverCount(pickup.latitude, pickup.longitude, 'bicycle_delivery'),
      fetchActiveRequestCount(),
    ]).then(([motor, delivery, bicycle, requests]) => {
      setDriverCounts({ motor, delivery, bicycle_delivery: bicycle });
      setSurgeInfo(calculateSurgeMultiplier(motor, requests, true));
    }).catch(() => {}).finally(() => setCountsLoading(false));
  }, [pickup?.latitude, pickup?.longitude]);

  const rides: RideOption[] = useMemo(() => {
    if (!routeData?.distance) return [];
    return [
      { id: '1', type: 'motor' as VehicleType,            title: 'Oye Motor',    image: '/images/motor.png',            disabled: false },
      { id: '2', type: 'delivery' as VehicleType,         title: 'Oye Delivery', image: '/images/box.png',              disabled: false },
      { id: '3', type: 'bicycle_delivery' as VehicleType, title: 'Oye Bicycle',  image: '/images/bicycle_delivery.png', disabled: false },
    ].map((r) => {
      const surge = surgeInfo.multiplier;
      const fare = calculateFare(routeData.distance, r.type, surge);
      const speedFactor: Record<string, number> = { motor: 1.2, delivery: 0.9, bicycle_delivery: 2.2 };
      const etaMins = Math.max(2, Math.round((routeData.duration / 60) * (speedFactor[r.type] || 1)));
      return {
        ...r,
        totalPrice: fare.totalFare,
        eta: `${etaMins} mins`,
        nearbyDrivers: driverCounts[r.type] ?? 0,
        surgeInfo: surgeInfo,
      };
    });
  }, [routeData, driverCounts, surgeInfo]);

  const selected = rides.find((r) => r.id === selectedId);

  return (
    <div style={s.sheet}>
      {/* Handle */}
      <div style={s.handle} />

      {/* Locations bar */}
      <div style={s.locBar}>
        <button style={s.cancelBtn} onClick={onCancel}>
          <Icon name="close" size={18} color="#333" />
        </button>
        <button style={s.locationsBtn} onClick={onEditLocations}>
          <div style={s.locRow}>
            <div style={{ ...s.dot, background: '#061ffa' }} />
            <span style={s.locText} title={pickup?.address}>{pickup?.address || 'Pickup'}</span>
          </div>
          <div style={s.locDivider} />
          <div style={s.locRow}>
            <div style={{ ...s.dot, background: '#ff7300' }} />
            <span style={s.locText} title={destination?.address}>{destination?.address || 'Destination'}</span>
          </div>
        </button>
        <button style={s.editBtn} onClick={onEditLocations}>
          <Icon name="edit" size={16} color="#061ffa" />
        </button>
      </div>

      {/* Payment / distance / promo */}
      <div style={s.infoBar}>
        <div style={s.pill}>
          <Icon name="cash" size={15} color="#061ffa" />
          <span style={s.pillText}>Cash</span>
          <Icon name="chevron-down" size={11} color="#aaa" />
        </div>
        <div style={s.pill}>
          <Icon name="navigation" size={13} color="#888" />
          <span style={s.pillText}>{routeData.distance.toFixed(2)} km</span>
        </div>
        {surgeInfo.isActive && (
          <div style={{ ...s.pill, background: '#fff3e0', border: '1px solid #ffcc80' }}>
            <Icon name="alert" size={13} color="#ff7300" />
            <span style={{ ...s.pillText, color: '#e65100', fontWeight: 700 }}>{surgeInfo.label}</span>
          </div>
        )}
        <div style={{ ...s.pill, marginLeft: 'auto' }}>
          <span style={s.pillText}>Promo</span>
        </div>
      </div>

      {/* Surge banner */}
      {surgeInfo.isActive && (
        <div style={s.surgeBanner}>
          <Icon name="warning" size={16} color="#e65100" style={{ flexShrink: 0 }} />
          <div>
            <div style={s.surgeTitle}>Surge pricing · {surgeInfo.label}</div>
            <div style={s.surgeSub}>{surgeInfo.reason} — fares are temporarily higher</div>
          </div>
        </div>
      )}

      {/* Ride list */}
      <div style={s.list}>
        {rides.map((ride) => {
          const isSelected = ride.id === selectedId;
          const count = ride.nearbyDrivers;
          return (
            <button
              key={ride.id}
              style={{
                ...s.rideRow,
                ...(isSelected ? s.rideRowSelected : {}),
                ...(ride.disabled ? { opacity: 0.4 } : {}),
              }}
              onClick={() => !ride.disabled && setSelectedId(ride.id)}
              disabled={ride.disabled}
            >
              <img src={ride.image} alt={ride.title} style={s.vImg} />
              <div style={s.rideInfo}>
                <span style={s.rideTitle}>{ride.title}</span>
                <div style={s.rideMeta}>
                  <span style={s.chip}>
                    <Icon name="clock" size={11} color="#888" />
                    <span style={s.chipTxt}>{ride.eta}</span>
                  </span>
                  <span style={{ ...s.chip, ...(count > 0 ? s.chipBlue : {}) }}>
                    <Icon name="profile" size={11} color={count > 0 ? '#061ffa' : '#aaa'} />
                    <span style={{ ...s.chipTxt, color: count > 0 ? '#061ffa' : '#aaa' }}>
                      {countsLoading ? '…' : count > 0 ? `${count} near` : 'No drivers'}
                    </span>
                  </span>
                </div>
              </div>
              <div style={s.priceWrap}>
                <span style={{ ...s.price, ...(isSelected ? { color: '#061ffa' } : {}) }}>
                  GHS {Math.round(ride.totalPrice)}
                </span>
                {surgeInfo.isActive && (
                  <span style={s.surgeTag}>{surgeInfo.label}</span>
                )}
                {isSelected && (
                  <div style={s.selectedCheck}>
                    <Icon name="check" size={12} color="white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer confirm */}
      <div style={s.footer}>
        <button
          style={{ ...s.confirmBtn, ...(!selected ? s.confirmDisabled : {}) }}
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
        >
          {selected ? `CONFIRM  ${selected.title.toUpperCase()}` : 'SELECT A RIDE TYPE'}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, background: 'white',
    borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column',
    boxShadow: '0 -6px 30px rgba(0,0,0,0.18)', zIndex: 300, maxHeight: '84%',
    animation: 'slideUp 0.3s ease',
  },
  handle: { width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '10px auto 0', flexShrink: 0 },
  locBar: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 10px',
    borderBottom: '1px solid #f0f0f0', flexShrink: 0,
  },
  cancelBtn: {
    width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0',
    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  locationsBtn: {
    flex: 1, background: '#f8f8f8', borderRadius: 12, padding: '8px 12px',
    border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  locRow: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  locText: {
    fontSize: 12, color: '#333', fontWeight: 500, fontFamily: "'Poppins', sans-serif",
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
  },
  locDivider: { height: 1, background: '#e0e0e0', margin: '4px 0 4px 16px' },
  editBtn: {
    width: 36, height: 36, borderRadius: '50%', background: '#e8edff',
    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  infoBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
    borderBottom: '1px solid #f5f5f5', flexShrink: 0, flexWrap: 'wrap',
  },
  pill: {
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
    background: '#f0f0f0', borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: 600, color: '#333', fontFamily: "'Poppins', sans-serif" },
  surgeBanner: {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
    background: '#fff8f0', borderBottom: '1px solid #ffe0b2', flexShrink: 0,
  },
  surgeTitle: { fontSize: 13, fontWeight: 700, color: '#e65100', fontFamily: "'Poppins', sans-serif" },
  surgeSub: { fontSize: 11, color: '#bf360c', fontFamily: "'Poppins', sans-serif" },
  list: { flex: 1, overflowY: 'auto' },
  rideRow: {
    display: 'flex', alignItems: 'center',
    padding: '14px 16px', background: 'transparent', border: 'none',
    borderRadius: 14, cursor: 'pointer', textAlign: 'left', margin: '4px 8px',
    width: 'calc(100% - 16px)',
    borderWidth: 2, borderStyle: 'solid', borderColor: 'transparent',
  },
  rideRowSelected: { borderColor: '#061ffa', background: 'rgba(6,31,250,0.04)' },
  vImg: { width: 80, height: 52, objectFit: 'contain', flexShrink: 0 },
  rideInfo: { flex: 1, paddingLeft: 14, paddingRight: 8 },
  rideTitle: { fontSize: 16, fontWeight: 700, color: '#333', display: 'block', marginBottom: 6, fontFamily: "'Poppins', sans-serif" },
  rideMeta: { display: 'flex', alignItems: 'center', gap: 8 },
  chip: { display: 'flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: '#f5f5f5', borderRadius: 8 },
  chipBlue: { background: '#e8edff' },
  chipTxt: { fontSize: 11, color: '#888', fontFamily: "'Poppins', sans-serif" },
  priceWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 },
  price: { fontSize: 18, fontWeight: 800, color: '#333', fontFamily: "'Poppins', sans-serif" },
  surgeTag: { fontSize: 10, fontWeight: 700, color: '#ff7300', background: '#fff3e0', padding: '2px 6px', borderRadius: 6 },
  selectedCheck: {
    width: 22, height: 22, borderRadius: '50%', background: '#061ffa',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  footer: {
    padding: '14px 16px', borderTop: '1px solid #f0f0f0', flexShrink: 0,
    paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
  },
  confirmBtn: {
    width: '100%', padding: '16px',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white', borderRadius: 20, fontSize: 16, fontWeight: 700,
    border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    letterSpacing: 0.5, boxShadow: '0 4px 20px rgba(6,31,250,0.4)',
  },
  confirmDisabled: { background: '#ccc', boxShadow: 'none', cursor: 'not-allowed' },
};
