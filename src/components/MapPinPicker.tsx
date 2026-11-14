import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icons"; // your existing Icon component
import { getReadableLocationName } from "@/services/geocoding";

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

interface LatLng {
  lat: number;
  lng: number;
}

// ── Google Maps loader (singleton) ─────────────────────────────────────────
const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(callback: () => void) {
  if (mapsLoaded) {
    callback();
    return;
  }
  mapsCallbacks.push(callback);
  if (mapsLoading) return;
  mapsLoading = true;
  (window as any).initMapPinPicker = () => {
    mapsLoaded = true;
    mapsCallbacks.forEach((cb) => cb());
    mapsCallbacks.length = 0;
  };
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMapPinPicker`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// ── Main component ─────────────────────────────────────────────────────────
export default function MapPinPicker({
  visible,
  onClose,
  onConfirm,
  initialRegion,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  const defaultCenter = initialRegion
    ? { lat: initialRegion.latitude, lng: initialRegion.longitude }
    : { lat: 5.5339, lng: -0.4167 }; // Kasoa, Ghana

  const [pinCoords, setPinCoords] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // ── Initialise map ───────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInstance.current || !window.google) return;

    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#f8f8f8" }] },
        { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "water", stylers: [{ color: "#dde8f0" }] },
        { featureType: "landscape", stylers: [{ color: "#f2f4f0" }] },
      ],
    });

    // Click to place pin
    mapInstance.current.addListener("click", (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      handleMapClick({ lat, lng });
    });

    geocoderRef.current = new window.google.maps.Geocoder();
  }, []);

  useEffect(() => {
    if (visible) {
      loadGoogleMaps(initMap);
    }
    // Cleanup on close
    if (!visible) {
      setPinCoords(null);
      setAddress(null);
      setLoadingAddress(false);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  }, [visible]);

  // ── Handle map click ─────────────────────────────────────────────────────
  const handleMapClick = async (coords: LatLng) => {
    setPinCoords(coords);
    setAddress(null);
    setLoadingAddress(true);

    // Try geocoding
    try {
      const readable = await getReadableLocationName({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      setAddress(readable || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
    } catch {
      try {
        if (geocoderRef.current) {
          const result = await new Promise<any[]>((resolve, reject) => {
            geocoderRef.current.geocode(
              { location: coords },
              (results: any[], status: string) => {
                if (status === "OK" && results[0]) resolve(results);
                else reject(status);
              },
            );
          });
          setAddress(result[0].formatted_address);
        }
      } catch {
        setAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
      }
    } finally {
      setLoadingAddress(false);
    }
  };

  // ── Add/update marker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (pinCoords) {
      markerRef.current = new window.google.maps.Marker({
        position: pinCoords,
        map: mapInstance.current,
        icon: createPinMarkerIcon(),
        zIndex: 30,
      });
    }
  }, [pinCoords]);

  const handleConfirm = () => {
    if (!pinCoords || !address) return;
    onConfirm({
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
      address,
    });
    // Reset internal state
    setPinCoords(null);
    setAddress(null);
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  };

  if (!visible) return null;

  return (
    <div style={s.overlay}>
      <div style={s.screen}>
        {/* Header */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={onClose}>
            <Icon name="arrow-back" size={24} color="#333" />
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={s.title}>Pin Location</h2>
            <p style={s.subtitle}>Tap anywhere on the map to drop a pin</p>
          </div>
        </div>

        {/* Map area */}
        <div style={s.mapContainer}>
          <div ref={mapRef} style={s.map} />

          {/* Hint overlay when no pin */}
          {!pinCoords && (
            <div style={s.hintOverlay}>
              <div style={s.hintBox}>
                <Icon name="map-pin" size={20} color="#061ffa" />
                <span style={s.hintText}>Tap the map to drop a pin</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom address card + confirm */}
        <div style={s.bottomCard}>
          {pinCoords ? (
            <>
              <div style={s.addressRow}>
                <div style={s.addressIcon}>
                  <Icon name="location" size={20} color="#061ffa" />
                </div>
                <div style={{ flex: 1 }}>
                  {loadingAddress ? (
                    <div style={s.loadingRow}>
                      <div style={s.spinner} />
                      <span style={s.loadingText}>Getting address…</span>
                    </div>
                  ) : (
                    <>
                      <div style={s.addressText} title={address || ""}>
                        {address}
                      </div>
                      <div style={s.coordText}>
                        {pinCoords.lat.toFixed(5)}, {pinCoords.lng.toFixed(5)}
                      </div>
                    </>
                  )}
                </div>
                <button
                  style={s.clearPinBtn}
                  onClick={() => {
                    setPinCoords(null);
                    setAddress(null);
                  }}
                >
                  <Icon name="close-circle" size={22} color="#888" />
                </button>
              </div>

              <button
                style={{
                  ...s.confirmBtn,
                  opacity: loadingAddress || !address ? 0.6 : 1,
                  cursor: loadingAddress || !address ? "not-allowed" : "pointer",
                }}
                onClick={handleConfirm}
                disabled={loadingAddress || !address}
              >
                Confirm This Location
              </button>
            </>
          ) : (
            <div style={s.noPin}>
              <Icon name="map" size={24} color="#888" />
              <span style={s.noPinText}>No pin placed yet. Tap the map.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper: custom SVG pin marker ──────────────────────────────────────────
function createPinMarkerIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="45" viewBox="0 0 36 45">
    <circle cx="18" cy="18" r="14" fill="#061ffa" stroke="white" stroke-width="2.5"/>
    <path d="M13 18l3 5 4-8" stroke="white" stroke-width="2" fill="none"/>
    <line x1="18" y1="32" x2="18" y2="45" stroke="#061ffa" stroke-width="2.5"/>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(36, 45),
    anchor: new window.google.maps.Point(18, 45),
  };
}

// ── Inline styles (hardcoded light theme) ──────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "white",
    display: "flex",
    flexDirection: "column",
  },
  screen: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "40px 16px 10px",
    background: "white",
    flexShrink: 0,
  },
  backBtn: {
    border: "none",
    background: "none",
    cursor: "pointer",
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  map: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  hintOverlay: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
    pointerEvents: "none",
  },
  hintBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 20,
    border: "1px solid #eee",
    background: "white",
    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
  },
  hintText: {
    fontSize: 13,
    fontWeight: 500,
    color: "#888",
  },
  bottomCard: {
    padding: 20,
    borderTop: "1px solid #eee",
    background: "white",
    flexShrink: 0,
  },
  addressRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#f0f2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  addressText: {
    fontSize: 15,
    fontWeight: 500,
    color: "#333",
    lineHeight: 1.4,
    wordBreak: "break-word",
  },
  coordText: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  clearPinBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  spinner: {
    width: 16,
    height: 16,
    border: "2px solid #eee",
    borderTop: "2px solid #061ffa",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 13,
    color: "#888",
  },
  confirmBtn: {
    width: "100%",
    padding: "16px",
    background: "#061ffa",
    color: "white",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },
  noPin: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    paddingBottom: 12,
  },
  noPinText: {
    fontSize: 14,
    color: "#888",
  },
};