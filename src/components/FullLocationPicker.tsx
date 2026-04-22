import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './Icons';
import { getReadableLocationName } from '@/services/geocoding';

declare global { interface Window { google: any } }

const GMAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pickup: LocationPoint, stops: LocationPoint[]) => void;
  initialPickup?: LocationPoint | null;
  initialStops?: LocationPoint[];
  userLocation?: { lat: number; lng: number } | null;
}

type ActiveField = { type: 'pickup' } | { type: 'stop'; index: number };

let autoService: any = null;
let geocoder: any = null;

function getServices() {
  if (window.google && !autoService) {
    autoService = new window.google.maps.places.AutocompleteService();
    geocoder = new window.google.maps.Geocoder();
  }
}

export default function FullLocationPicker({
  visible, onClose, onConfirm, initialPickup, initialStops, userLocation,
}: Props) {
  const [pickup, setPickup] = useState<LocationPoint | null>(initialPickup || null);
  const [stops, setStops] = useState<(LocationPoint | null)[]>(
    initialStops?.length ? initialStops : [null],
  );
  const [activeField, setActiveField] = useState<ActiveField>({ type: 'pickup' });
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [skeletonVisible, setSkeletonVisible] = useState(false);
  const [predictionsWithDistance, setPredictionsWithDistance] = useState<any[]>([]);

  // Refs for auto-focusing
  const pickupRef = useRef<HTMLInputElement>(null);
  const stopRefs = useRef<(HTMLInputElement | null)[]>([]);
  const debounceRef = useRef<any>(null);


  // Calculate Distance between user and the locations prediction
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

  useEffect(() => {
    if (visible) {
      getServices();
      setTimeout(() => pickupRef.current?.focus(), 100);
    }
  }, [visible]);

  // Auto-fill pickup with the user's current location on initial open
  useEffect(() => {
    if (!visible || pickup || !userLocation) return;

    // Geocoder may not be ready immediately — wait for Google Maps to init
    const tryGeocode = async () => {
      getServices();
      if (!geocoder) return;

       geocoder.geocode(
    { location: { lat: userLocation.lat, lng: userLocation.lng } },
    async (results: any[], status: string) => {
      let address = '';
      
      if (status === 'OK' && results[0]) {
        address = results[0].formatted_address;
        
        // If it's a Plus Code or seems too vague, try Places API
        if (address.includes('+') || address.split(',').length < 3) {
          try {
            const service = new window.google.maps.places.PlacesService(document.createElement('div'));
            service.nearbySearch(
              {
                location: new window.google.maps.LatLng(userLocation.lat, userLocation.lng),
                radius: 100,
              },
              (places: any[], placesStatus: string) => {
                if (placesStatus === window.google.maps.places.PlacesServiceStatus.OK && places[0]) {
                  address = `${places[0].name}, ${places[0].vicinity}`;
                }
                setPickup({
                  latitude: userLocation.lat,
                  longitude: userLocation.lng,
                  address: address || `Current Location`,
                });
              }
            );
            return;
          } catch (e) {
            // Fall through to use geocoder result
          }
        }
      }
      
      setPickup({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        address: address || `Current Location`,
      });
    }
  );
      // const address = await getReadableLocationName({ latitude: userLocation.lat, longitude: userLocation.lng });
      // setPickup({
      //   latitude: userLocation.lat,
      //   longitude: userLocation.lng,
      //   address,
      // });
    };

    // Small delay to ensure Google Maps services are initialised
    const timer = setTimeout(tryGeocode, 200);
    return () => clearTimeout(timer);
  }, [visible, userLocation]);

  const searchPlaces = useCallback((input: string) => {
    if (!input.trim() || !autoService) { 
      setPredictions([]); 
      setPredictionsWithDistance([])
      setSkeletonVisible(false); 
      return; 
    }

    setSkeletonVisible(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const bias = userLocation
        ? { location: new window.google.maps.LatLng(userLocation.lat, userLocation.lng), radius: 50000 }
        : {};
      autoService.getPlacePredictions(
        { input, ...bias },
        async (preds: any[], status: string) => {
            if (status === 'OK' && preds) {
          // Fetch geometry for each prediction to calculate distance
          const predsWithDist = await Promise.all(
            preds.map(async (pred) => {
              try {
                const loc = await resolvePlace(pred);
                const distance = userLocation 
                  ? calculateDistance(
                      userLocation.lat, 
                      userLocation.lng, 
                      loc.latitude, 
                      loc.longitude
                    )
                  : Infinity;
                return { ...pred, distance, location: loc };
              } catch {
                return { ...pred, distance: Infinity };
              }
            })
          );
          
          // Sort by distance
          predsWithDist.sort((a, b) => a.distance - b.distance);
          
          setPredictionsWithDistance(predsWithDist);
          setPredictions(preds); // Keep original for backward compatibility
        } else {
          setPredictionsWithDistance([]);
          setPredictions([]);
        }
        setSkeletonVisible(false);
      },
    );
    }, 300);
  }, [userLocation]);

   const useCurrentLocation = () => {
    if (!userLocation || !geocoder) return;
    geocoder.geocode(
      { location: { lat: userLocation.lat, lng: userLocation.lng } },
      (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const loc: LocationPoint = {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            address: results[0].formatted_address,
          };
          setPickup(loc);
          setActiveField({ type: 'stop', index: 0 });
          setPredictions([]);
          // setQuery('');
        }
      },
    );
  };

  const resolvePlace = async (pred: any): Promise<LocationPoint> => {
    return new Promise((resolve, reject) => {
      if (!geocoder) { reject('No geocoder'); return; }
      geocoder.geocode({ placeId: pred.place_id }, (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          resolve({
            latitude: loc.lat(),
            longitude: loc.lng(),
            address: pred.description,
          });
        } else reject('Geocode failed');
      });
    });
  };

  const handleSelectPrediction = async (pred: any) => {
    setLoading(true);
    try {
      const loc = await resolvePlace(pred);
      setPredictions([]);

      if (activeField.type === 'pickup') {
        setPickup(loc);
        // Focus first stop after pickup is set
        stopRefs.current[0]?.focus();
      } else {
        const idx = activeField.index;
        const newStops = [...stops];
        newStops[idx] = loc;
        setStops(newStops);
        
        // Focus next empty stop if it exists
        if (idx + 1 < stops.length) {
            stopRefs.current[idx + 1]?.focus();
        }
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const addStop = () => {
    if (stops.length < 3) {
      const newStops = [...stops, null];
      setStops(newStops);
      setTimeout(() => stopRefs.current[newStops.length - 1]?.focus(), 50);
    }
  };

  const removeStop = (idx: number) => {
    const newStops = stops.filter((_, i) => i !== idx);
    setStops(newStops.length > 0 ? newStops : [null]);
  };

  const canConfirm = !!pickup && stops.some((s) => !!s?.latitude);

  if (!visible) return null;

  return (
    <div style={s.overlay}>
      <div style={s.screen}>
        {/* Header */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={onClose}>
            <Icon name="close" size={22} color="#333" />
          </button>
          <h2 style={s.headerTitle}>Select Route</h2>
        </div>

        {/* Route fields card - Inputs are now here directly */}
        <div style={s.fieldsCard}>
          {/* Pickup Input */}
          <div style={{ ...s.inputWrapper, ...(activeField.type === 'pickup' ? s.activeBg : {}) }}>
            <div style={{ ...s.routeDot, background: '#061ffa' }} />
            <input
              ref={pickupRef}
              style={s.fieldInput}
              placeholder="Pickup location"
              value={pickup?.address || ''}
              onFocus={() => {
                  setActiveField({ type: 'pickup' });
                  if (pickup?.address) searchPlaces(pickup.address);
              }}
              onChange={(e) => {
                const val = e.target.value;
                setPickup(val ? { ...pickup!, address: val } : null);
                searchPlaces(val);
              }}
            />
          </div>

          {/* Stop Inputs */}
          {stops.map((stop, idx) => (
            <React.Fragment key={idx}>
              <div style={s.routeConnector} />
              <div style={{ 
                ...s.inputWrapper, 
                ...(activeField.type === 'stop' && activeField.index === idx ? s.activeBg : {}),
                display: 'flex', alignItems: 'center'
              }}>
                <div style={{ ...s.routeDot, background: idx === stops.length - 1 ? '#ff7300' : '#888' }} />
                <input
                  ref={(el) => (stopRefs.current[idx] = el)}
                  style={s.fieldInput}
                  placeholder={idx === stops.length - 1 ? "Where to?" : "Add stop"}
                  value={stop?.address || ''}
                  onFocus={() => {
                      setActiveField({ type: 'stop', index: idx });
                      if (stop?.address) searchPlaces(stop.address);
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    const newStops = [...stops];
                    newStops[idx] = val ? { ...(newStops[idx] || { latitude: 0, longitude: 0 }), address: val } : null;
                    setStops(newStops);
                    searchPlaces(val);
                  }}
                />
                {stops.length > 1 && (
                  <button style={s.removeStopBtn} onClick={() => removeStop(idx)}>
                    <Icon name="cancel" size={18} color="#ff4d4d" />
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}

          {/* Add Multistop Button */}
          {stops.length < 3 && (
            <button style={s.addStopBtn} onClick={addStop}>
              <Icon name="check" size={16} color="#061ffa" strokeWidth={3} />
              <span style={s.addStopText}>Add stop</span>
            </button>
          )}
        </div>

        {/* Results Scroll Area */}
        <div style={s.resultsList}>
          {/* 1. Current Location Shortcut: Only for Pickup field when empty */}
  {activeField.type === 'pickup' && !pickup?.address && userLocation && (
    <button style={s.currentLocBtn} onClick={useCurrentLocation}>
      <div style={s.currentLocIcon}>
        <Icon name="navigation" size={20} color="#061ffa" />
      </div>
      <div>
        <div style={s.currentLocTitle}>Current Location</div>
        <div style={s.currentLocSub}>Use your GPS location</div>
      </div>
    </button>
  )}
          {/* Skeleton loader */}
          {skeletonVisible && !predictionsWithDistance.length && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={s.skeletonRow}>
                  <div style={s.skeletonIcon} />
                  <div style={s.skeletonTexts}>
                    <div style={{ ...s.skeletonLine, width: '70%' }} />
                    <div style={{ ...s.skeletonLine, width: '50%', marginTop: 6 }} />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Real predictions */}
          {predictionsWithDistance.map((pred) => (
  <button
    key={pred.place_id}
    style={s.predRow}
    onClick={() => handleSelectPrediction(pred)}
    disabled={loading}
  >
    <div style={s.predIcon}>
      <Icon name="map-pin" size={18} color="#888" />
    </div>
    <div style={s.predTexts}>
      <div style={s.predMain}>
        {pred.structured_formatting?.main_text || pred.description}
      </div>
      <div style={s.predSub}>
        {pred.structured_formatting?.secondary_text || ''}
        {/* {pred.distance < Infinity && (
          <span style={s.distanceBadge}>
            {' • '}{pred.distance < 1 
              ? `${(pred.distance * 1000).toFixed(0)}m` 
              : `${pred.distance.toFixed(1)}km`}
          </span>
        )} */}
      </div>
    </div>
  </button>
))}
        </div>

        {/* Footer Confirm */}
        <div style={s.footer}>
          <button
            style={{ ...s.confirmBtn, ...(canConfirm ? {} : s.confirmBtnDisabled) }}
            onClick={() => onConfirm(pickup!, stops.filter(s => !!s) as LocationPoint[])}
            disabled={!canConfirm}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'white', display: 'flex', flexDirection: 'column',
  },
  screen: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '40px 16px 10px', background: 'white', flexShrink: 0,
  },
  backBtn: { border: 'none', background: 'none', cursor: 'pointer', padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 600, color: '#333' },
  fieldsCard: {
    margin: '10px 16px', padding: '12px', border: '1px solid #eee',
    borderRadius: 12, background: '#fff', display: 'flex', flexDirection: 'column',
  },
  inputWrapper: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
    borderRadius: 8, transition: 'background 0.2s',
  },
  activeBg: { background: '#f0f2ff' },
  fieldInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: 15, padding: '4px 0', color: '#333',
  },
  routeDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  routeConnector: { width: 1, height: 12, background: '#eee', marginLeft: 13 },
  removeStopBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' },
  addStopBtn: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px',
    background: 'none', border: 'none', cursor: 'pointer', marginTop: 4,
  },
  addStopText: { fontSize: 14, fontWeight: 600, color: '#061ffa' },
  resultsList: { flex: 1, overflowY: 'auto' },
  skeletonRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f5f5f5' },
  skeletonIcon: { width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0' },
  skeletonTexts: { flex: 1 },
  skeletonLine: { height: 12, borderRadius: 6, background: '#f0f0f0' },
  predRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
    padding: '14px 20px', background: 'transparent', border: 'none',
    borderBottom: '1px solid #f5f5f5', cursor: 'pointer', textAlign: 'left',
  },
  predIcon: {
    width: 36, height: 36, borderRadius: '50%', background: '#f5f5f5',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  predTexts: { flex: 1, overflow: 'hidden' },
  predMain: { fontSize: 15, fontWeight: 500, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  predSub: { fontSize: 12, color: '#888', marginTop: 2 },
  footer: { padding: '16px', borderTop: '1px solid #f0f0f0' },
  confirmBtn: {
    width: '100%', padding: '16px', background: '#061ffa', color: 'white',
    borderRadius: 12, fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
  },
  confirmBtnDisabled: { background: '#ccc', cursor: 'not-allowed' },

  currentLocBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #f5f5f5',
    cursor: 'pointer',
    textAlign: 'left',
  },
  currentLocIcon: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#e8edff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  currentLocTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#061ffa',
  },
  currentLocSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  distanceBadge: {
  color: '#061ffa',
  fontWeight: 500,
},
};