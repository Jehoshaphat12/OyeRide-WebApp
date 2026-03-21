import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface Props {
  pickup: Location | null;
  destination: Location | null;
  onPickupChange: (loc: Location | null) => void;
  onDestinationChange: (loc: Location | null) => void;
  userLocation: { lat: number; lng: number } | null;
}

declare global {
  interface Window { google: any; }
}

export default function LocationSearch({ pickup, destination, onPickupChange, onDestinationChange, userLocation }: Props) {
  const [activeField, setActiveField] = useState<'pickup' | 'destination' | null>(null);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const autocompleteService = useRef<any>(null);
  const geocoder = useRef<any>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const initServices = () => {
      if (window.google) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        geocoder.current = new window.google.maps.Geocoder();
      }
    };
    if (window.google) initServices();
    else {
      const check = setInterval(() => {
        if (window.google) { initServices(); clearInterval(check); }
      }, 300);
    }
  }, []);

  const searchPlaces = (input: string) => {
    if (!input.trim() || !autocompleteService.current) { setPredictions([]); return; }
    setSearching(true);
    const biasLocation = userLocation ? new window.google.maps.LatLng(userLocation.lat, userLocation.lng) : undefined;
    autocompleteService.current.getPlacePredictions(
      {
        input,
        ...(biasLocation ? { location: biasLocation, radius: 50000 } : {}),
        componentRestrictions: {},
      },
      (preds: any[], status: string) => {
        setSearching(false);
        if (status === 'OK' && preds) setPredictions(preds);
        else setPredictions([]);
      },
    );
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 350);
  };

  const handleSelectPrediction = (pred: any) => {
    if (!geocoder.current) return;
    geocoder.current.geocode({ placeId: pred.place_id }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        const location: Location = {
          latitude: loc.lat(),
          longitude: loc.lng(),
          address: pred.description,
        };
        if (activeField === 'pickup') onPickupChange(location);
        else onDestinationChange(location);
        setActiveField(null);
        setQuery('');
        setPredictions([]);
      }
    });
  };

  const useCurrentLocation = () => {
    if (!userLocation || !geocoder.current) return;
    geocoder.current.geocode(
      { location: { lat: userLocation.lat, lng: userLocation.lng } },
      (results: any[], status: string) => {
        if (status === 'OK' && results[0]) {
          const location: Location = {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            address: results[0].formatted_address,
          };
          onPickupChange(location);
          setActiveField(null);
          setQuery('');
        }
      },
    );
  };

  const isExpanded = activeField !== null;

  return (
    <>
      {/* Collapsed bottom sheet */}
      {!isExpanded && (
        <div style={styles.sheet}>
          <div style={styles.handle} />
          <p style={styles.prompt}>Where to?</p>
          <div style={styles.fields}>
            <button style={styles.fieldBtn} onClick={() => { setActiveField('pickup'); setQuery(pickup?.address || ''); }}>
              <div style={{ ...styles.dot, background: '#061ffa' }} />
              <span style={{ ...styles.fieldText, color: pickup ? '#333' : '#999' }}>
                {pickup ? pickup.address : 'Choose pickup location'}
              </span>
              {pickup && <button style={styles.clearBtn} onClick={(e) => { e.stopPropagation(); onPickupChange(null); }}><Icon name="close" size={10} color="#666" strokeWidth={3} /></button>}
            </button>
            <div style={styles.routeLine} />
            <button style={styles.fieldBtn} onClick={() => { setActiveField('destination'); setQuery(destination?.address || ''); }}>
              <div style={{ ...styles.dot, background: '#ff7300' }} />
              <span style={{ ...styles.fieldText, color: destination ? '#333' : '#999' }}>
                {destination ? destination.address : 'Where are you going?'}
              </span>
              {destination && <button style={styles.clearBtn} onClick={(e) => { e.stopPropagation(); onDestinationChange(null); }}><Icon name="close" size={10} color="#666" strokeWidth={3} /></button>}
            </button>
          </div>
        </div>
      )}

      {/* Expanded search overlay */}
      {isExpanded && (
        <div style={styles.overlay}>
          <div style={styles.searchHeader}>
            <button style={styles.backBtn} onClick={() => { setActiveField(null); setQuery(''); setPredictions([]); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <div style={styles.searchInputWrap}>
              <div style={{ ...styles.searchDot, background: activeField === 'pickup' ? '#061ffa' : '#ff7300' }} />
              <input
                autoFocus
                style={styles.searchInput}
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={activeField === 'pickup' ? 'Search pickup...' : 'Search destination...'}
              />
              {query ? (
                <button style={styles.clearInputBtn} onClick={() => { setQuery(''); setPredictions([]); }}><Icon name="close" size={10} color="#666" strokeWidth={3} /></button>
              ) : null}
            </div>
          </div>

          <div style={styles.searchResults}>
            {/* Current location quick option for pickup */}
            {activeField === 'pickup' && userLocation && (
              <button style={styles.currentLocBtn} onClick={useCurrentLocation}>
                <div style={styles.currentLocIcon}>
                  <Icon name="navigation" size={20} color="#061ffa" />
                </div>
                <div>
                  <div style={styles.currentLocTitle}>Current Location</div>
                  <div style={styles.currentLocSub}>Use your GPS location</div>
                </div>
              </button>
            )}

            {/* Previously set address shortcut */}
            {activeField === 'destination' && pickup && !query && (
              <div style={styles.sectionLabel}>RECENT</div>
            )}

            {/* Predictions */}
            {searching && (
              <div style={styles.loadingRow}>
                <div style={styles.loadingSpinner} />
                <span>Searching...</span>
              </div>
            )}
            {predictions.map((pred) => (
              <button key={pred.place_id} style={styles.predRow} onClick={() => handleSelectPrediction(pred)}>
                <div style={styles.predIcon}>
                  <Icon name="map-pin" size={18} color="#888" />
                </div>
                <div style={styles.predTexts}>
                  <div style={styles.predMain}>{pred.structured_formatting?.main_text || pred.description}</div>
                  <div style={styles.predSub}>{pred.structured_formatting?.secondary_text || ''}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sheet: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '24px 24px 0 0',
    padding: '12px 20px 20px',
    boxShadow: '0 -4px 30px rgba(0,0,0,0.15)',
    zIndex: 200,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: '#ddd',
    margin: '0 auto 16px',
  },
  prompt: {
    fontSize: 20,
    fontWeight: 700,
    color: '#333',
    marginBottom: 16,
  },
  fields: {
    background: '#f7f7f7',
    borderRadius: 16,
    padding: '4px 0',
    overflow: 'hidden',
  },
  fieldBtn: {
    width: '100%',
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  fieldText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "'Poppins', sans-serif",
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  clearBtn: {
    background: '#ddd',
    border: 'none',
    borderRadius: '50%',
    width: 20,
    height: 20,
    fontSize: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#666',
    flexShrink: 0,
  },
  routeLine: {
    width: 1,
    height: 20,
    background: '#ddd',
    marginLeft: 35,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'white',
    zIndex: 500,
    display: 'flex',
    flexDirection: 'column',
  },
  searchHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '52px 16px 12px',
    borderBottom: '1px solid #eee',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#f0f0f0',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },
  searchInputWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#f5f5f5',
    borderRadius: 12,
    padding: '12px 14px',
  },
  searchDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 14,
    fontFamily: "'Poppins', sans-serif",
    color: '#333',
  },
  clearInputBtn: {
    background: '#ddd',
    border: 'none',
    borderRadius: '50%',
    width: 20,
    height: 20,
    fontSize: 10,
    cursor: 'pointer',
    color: '#666',
  },
  searchResults: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  currentLocBtn: {
    width: '100%',
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
    textAlign: 'left',
    borderBottom: '1px solid #f0f0f0',
  },
  currentLocIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#e8edff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  currentLocTitle: { fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 2 },
  currentLocSub: { fontSize: 12, color: '#888' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#aaa',
    letterSpacing: 1,
    padding: '12px 20px 4px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    color: '#888',
    fontSize: 14,
  },
  loadingSpinner: {
    width: 18,
    height: 18,
    border: '2px solid #eee',
    borderTop: '2px solid #061ffa',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  predRow: {
    width: '100%',
    padding: '14px 20px',
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    cursor: 'pointer',
    textAlign: 'left',
    borderBottom: '1px solid #f5f5f5',
  },
  predIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#f5f5f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  predTexts: { flex: 1, overflow: 'hidden' },
  predMain: {
    fontSize: 14,
    fontWeight: 600,
    color: '#333',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  predSub: {
    fontSize: 12,
    color: '#888',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
};
