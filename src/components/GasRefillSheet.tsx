import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icons";
import PickupLocationPicker from "./PickupLocationPicker";
import { calculateGasRefillFare, GAS_REFILL_CONFIG } from "@/lib/fareCalculator";

const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

// ── Google Maps JS SDK loader (singleton, same pattern as MapView.tsx) ─────
// Uses the JS SDK instead of raw fetch() to the Places REST endpoint, since
// that endpoint isn't reliably reachable via fetch() from a browser (CORS).
// Shares the same window.initGoogleMaps callback name as MapView, so if
// MapView has already loaded the script, this just reuses it — no duplicate
// <script> tag gets injected either way.
declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(callback: () => void) {
  if (window.google?.maps?.places) {
    mapsLoaded = true;
    callback();
    return;
  }
  if (mapsLoaded) {
    callback();
    return;
  }
  mapsCallbacks.push(callback);
  if (mapsLoading) return;
  mapsLoading = true;
  window.initGoogleMaps = () => {
    mapsLoaded = true;
    mapsCallbacks.forEach((cb) => cb());
    mapsCallbacks.length = 0;
  };
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

interface GasStation {
  place_id: string;
  name: string;
  vicinity: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  pickup: { latitude: number; longitude: number; address: string } | null;
  onPickupChange?: (pickup: any) => void;
  onConfirm: (bookingData: {
    station: GasStation;
    cylinderSize: "small" | "large";
    totalFare: number;
    fareBreakdown: any;
    distanceToStation: number;
    distanceBack: number;
  }) => void;
  userLocation?: { lat: number; lng: number } | null;
}

// Haversine distance in km
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function GasRefillSheet({
  visible,
  onClose,
  pickup,
  onPickupChange,
  onConfirm,
  userLocation,
}: Props) {
  const [stations, setStations] = useState<GasStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<GasStation | null>(
    null,
  );
  const [cylinderSize, setCylinderSize] = useState<"small" | "large">("small");
  const [loadingStations, setLoadingStations] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pickupLocationPickerVisible, setPickupLocationPickerVisible] =
    useState(false);
  const placesServiceRef = useRef<any>(null);

  // Treat (0, 0) as "no coordinates" rather than a real location — a 0,0
  // pickup can slip through if a place lookup fails upstream (e.g. in
  // PickupLocationPicker), and ?? alone won't fall back since 0 isn't
  // null/undefined. Falling back here means we use userLocation instead of
  // silently searching at the equator/prime-meridian.
  const isValidCoord = (lat?: number, lng?: number) =>
    lat != null && lng != null && (lat !== 0 || lng !== 0);

  const userLat = isValidCoord(pickup?.latitude, pickup?.longitude)
    ? pickup!.latitude
    : userLocation?.lat ?? null;
  const userLng = isValidCoord(pickup?.latitude, pickup?.longitude)
    ? pickup!.longitude
    : userLocation?.lng ?? null;

  // Lock page scroll while the modal is open
  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose]);

  // Fetch nearby stations
  useEffect(() => {
    if (!visible || userLat == null || userLng == null) return;
    loadGoogleMaps(fetchNearbyStations);
  }, [visible, userLat, userLng]);

  const fetchNearbyStations = () => {
    if (!window.google?.maps?.places) return;
    if (userLat == null || userLng == null) return;
    setLoadingStations(true);

    if (!placesServiceRef.current) {
      // PlacesService requires a map or a plain DOM node to attach to —
      // it doesn't render anything into it, so a detached div is fine.
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        document.createElement("div"),
      );
    }

    placesServiceRef.current.nearbySearch(
      {
        location: { lat: userLat, lng: userLng },
        radius: 5000,
        type: "gas_station",
      },
      (results: any[] | null, status: string) => {
        setLoadingStations(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results.length > 0
        ) {
          const mapped: GasStation[] = results.slice(0, 5).map((p: any) => ({
            place_id: p.place_id,
            name: p.name,
            vicinity: p.vicinity || "",
            latitude: p.geometry.location.lat(),
            longitude: p.geometry.location.lng(),
            distanceKm: haversineKm(
              userLat,
              userLng,
              p.geometry.location.lat(),
              p.geometry.location.lng(),
            ),
          }));
          mapped.sort((a, b) => a.distanceKm - b.distanceKm);
          setStations(mapped);
          setSelectedStation(mapped[0]);
        } else {
          alert(
            "No gas stations found within 5km. Please try from a different location.",
          );
        }
      },
    );
  };

  // Fare calculation
  const fareResult = useMemo(() => {
    if (!selectedStation) return null;
    const dist = selectedStation.distanceKm;
    return calculateGasRefillFare(dist, dist, cylinderSize);
  }, [selectedStation, cylinderSize]);

  const handlePickupLocationConfirm = (pickupLoc: any) => {
    onPickupChange?.(pickupLoc);
    setPickupLocationPickerVisible(false);
  };

  const handleConfirm = async () => {
    if (!selectedStation || !fareResult) return;
    const confirmedPickup =
      pickup ??
      (userLocation
        ? {
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            address: "Current location",
          }
        : null);

    if (!confirmedPickup) {
      alert("Please wait for your location or set a pickup address first.");
      return;
    }
    setConfirming(true);
    try {
      onConfirm({
        station: selectedStation,
        cylinderSize,
        totalFare: fareResult.totalFare,
        fareBreakdown: fareResult.breakdown,
        distanceToStation: selectedStation.distanceKm,
        distanceBack: selectedStation.distanceKm,
      });
    } finally {
      setConfirming(false);
    }
  };

  if (!visible) return null;

  return (
    <div style={s.overlay} role="dialog" aria-modal="true" aria-label="Gas Cylinder Refill">
      <div style={s.panel}>
        <div style={s.scrollContent}>
          {/* Header */}
          <div style={s.header}>
            <div style={s.iconBox}>
              <Icon name="flame" size={22} color="#061ffa" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={s.title}>Gas Cylinder Refill</h2>
              <p style={s.subtitle}>We pick up, fill, and return your cylinder</p>
            </div>
            <button style={s.closeBtn} onClick={onClose} aria-label="Close">
              <Icon name="close" size={22} color="#888" />
            </button>
          </div>

          {/* Pickup location */}
          <div style={s.section}>
            <div style={s.sectionLabel}>YOUR LOCATION</div>
            <button
              style={s.locationRow}
              onClick={() => setPickupLocationPickerVisible(true)}
            >
              <div style={s.locationDot} />
              <span style={s.locationText}>
                {pickup?.address || "Current location"}
              </span>
            </button>
          </div>

          {/* Nearest gas stations */}
          <div style={s.section}>
            <div style={s.sectionLabel}>SELECT GAS STATION</div>
            {loadingStations ? (
              <div style={s.loadingRow}>
                <div style={s.spinner} />
                <span style={s.loadingText}>Finding nearby stations…</span>
              </div>
            ) : stations.length === 0 ? (
              <button
                style={s.retryBox}
                onClick={() => loadGoogleMaps(fetchNearbyStations)}
              >
                <Icon name="refresh" size={20} color="#061ffa" />
                <span style={s.retryText}>Tap to search again</span>
              </button>
            ) : (
              stations.map((station) => {
                const isSelected =
                  selectedStation?.place_id === station.place_id;
                return (
                  <button
                    key={station.place_id}
                    style={{
                      ...s.stationRow,
                      borderColor: isSelected ? "#061ffa" : "#eee",
                      backgroundColor: isSelected ? "#f0f2ff" : "#fff",
                    }}
                    onClick={() => setSelectedStation(station)}
                  >
                    <div style={s.stationIconBox}>
                      <Icon name="flame-outline" size={18} color="#061ffa" />
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div style={s.stationName}>{station.name}</div>
                      <div style={s.stationAddress}>{station.vicinity}</div>
                    </div>
                    <div style={s.stationRight}>
                      <span
                        style={{
                          ...s.stationDist,
                          color: isSelected ? "#061ffa" : "#888",
                        }}
                      >
                        {station.distanceKm < 1
                          ? `${(station.distanceKm * 1000).toFixed(0)}m`
                          : `${station.distanceKm.toFixed(1)}km`}
                      </span>
                      {isSelected && (
                        <Icon name="checkmark-circle" size={18} color="#061ffa" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Cylinder size */}
          <div style={s.section}>
            <div style={s.sectionLabel}>CYLINDER SIZE</div>
            <div style={s.sizeRow}>
              {(["small", "large"] as const).map((size) => {
                const isSelected = cylinderSize === size;
                return (
                  <button
                    key={size}
                    style={{
                      ...s.sizeChip,
                      borderColor: isSelected ? "#061ffa" : "#eee",
                      backgroundColor: isSelected ? "#f0f2ff" : "#fff",
                    }}
                    onClick={() => setCylinderSize(size)}
                  >
                    <Icon
                      name="cube-outline"
                      size={18}
                      color={isSelected ? "#061ffa" : "#888"}
                    />
                    <div style={{ textAlign: "left" }}>
                      <div
                        style={{
                          ...s.sizeName,
                          color: isSelected ? "#061ffa" : "#333",
                        }}
                      >
                        {size === "small" ? "Small" : "Large"}
                      </div>
                      <div style={s.sizeWeight}>
                        {size === "small" ? "~6 kg" : "~12 kg"}
                      </div>
                    </div>
                    <span
                      style={{
                        ...s.sizeFee,
                        color: isSelected ? "#061ffa" : "#888",
                      }}
                    >
                      +GHS {GAS_REFILL_CONFIG.cylinderServiceFee[size]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fare breakdown */}
          {fareResult && (
            <div style={s.section}>
              <div style={s.sectionLabel}>FARE BREAKDOWN</div>
              <div style={s.fareBox}>
                {fareResult.breakdown.map((item: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      ...s.fareRow,
                      borderBottom:
                        i === fareResult.breakdown.length - 1
                          ? "none"
                          : "1px solid #eee",
                    }}
                  >
                    <span style={s.fareDesc}>{item.description}</span>
                    <span style={s.fareAmt}>
                      GHS {item.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div style={s.fareTotalRow}>
                  <span style={s.fareTotalLabel}>Total</span>
                  <span style={s.fareTotalAmt}>
                    GHS {fareResult.totalFare.toFixed(2)}
                  </span>
                </div>
              </div>
              <p style={s.fareNote}>
                ⏱ Includes 20-min waiting allowance. Extra waiting charged at
                GHS {GAS_REFILL_CONFIG.waitingPerMinuteAfter}/min.
              </p>
            </div>
          )}
        </div>

        {/* Confirm button */}
        <div style={s.footer}>
          <div style={s.footerInner}>
            <button
              style={{
                ...s.confirmBtn,
                backgroundColor:
                  selectedStation && fareResult ? "#061ffa" : "#ccc",
                cursor:
                  selectedStation && fareResult ? "pointer" : "not-allowed",
              }}
              onClick={handleConfirm}
              disabled={!selectedStation || !fareResult || confirming}
            >
              {confirming ? (
                <div style={s.spinnerWhite} />
              ) : selectedStation && fareResult ? (
                `BOOK REFILL — GHS ${fareResult.totalFare.toFixed(2)}`
              ) : (
                "SELECT A STATION"
              )}
            </button>
          </div>
        </div>
      </div>

      <PickupLocationPicker
        visible={pickupLocationPickerVisible}
        onClose={() => setPickupLocationPickerVisible(false)}
        onConfirm={handlePickupLocationConfirm}
        initialPickup={pickup}
        userLocation={userLocation}
      />
    </div>
  );
}

// ---------- Styles ----------
const s: Record<string, React.CSSProperties> = {
  // Full-page overlay — covers the entire viewport on every screen size.
  // There's no backdrop-click-to-close since the panel IS the page; closing
  // is explicit via the close button (or Escape).
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 500,
    backgroundColor: "white",
    display: "flex",
    justifyContent: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 720,
    height: "100%",
    backgroundColor: "white",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  scrollContent: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 20px 20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    backgroundColor: "#f0f2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: 600,
    color: "#333",
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "#888",
    margin: "2px 0 0",
  },
  closeBtn: {
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#888",
    marginBottom: 10,
  },
  locationRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #eee",
    backgroundColor: "#fff",
    width: "100%",
    cursor: "pointer",
    textAlign: "left",
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    backgroundColor: "#061ffa",
    flexShrink: 0,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 500,
    color: "#333",
    flex: 1,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid #eee",
    borderTop: "2px solid #061ffa",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { fontSize: 13, color: "#888" },
  retryBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    border: "1px dashed #ccc",
    background: "transparent",
    width: "100%",
    cursor: "pointer",
  },
  retryText: { fontSize: 14, fontWeight: 500, color: "#061ffa" },
  stationRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    border: "1.5px solid #eee",
    marginBottom: 8,
    width: "100%",
    background: "white",
    cursor: "pointer",
  },
  stationIconBox: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    backgroundColor: "#f0f2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  stationName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#333",
    marginBottom: 2,
  },
  stationAddress: { fontSize: 12, color: "#888" },
  stationRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },
  stationDist: { fontSize: 12, fontWeight: 600 },
  sizeRow: { display: "flex", gap: 12 },
  sizeChip: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    border: "1.5px solid #eee",
    background: "white",
    cursor: "pointer",
  },
  sizeName: { fontSize: 14, fontWeight: 600 },
  sizeWeight: { fontSize: 11, color: "#888" },
  sizeFee: { marginLeft: "auto", fontSize: 12, fontWeight: 600 },
  fareBox: {
    borderRadius: 12,
    border: "1px solid #eee",
    overflow: "hidden",
    marginBottom: 8,
    background: "#fff",
  },
  fareRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderBottom: "1px solid #eee",
  },
  fareDesc: { fontSize: 13, color: "#888", flex: 1, paddingRight: 10 },
  fareAmt: { fontSize: 13, fontWeight: 600, color: "#333" },
  fareTotalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderTop: "1px solid #eee",
    backgroundColor: "#f9f9f9",
  },
  fareTotalLabel: { fontSize: 15, fontWeight: 600, color: "#333" },
  fareTotalAmt: { fontSize: 17, fontWeight: 700, color: "#061ffa" },
  fareNote: {
    fontSize: 11,
    color: "#888",
    lineHeight: 1.5,
    margin: 0,
  },
  footer: {
    padding: "16px 20px",
    borderTop: "1px solid #eee",
    background: "white",
    display: "flex",
    justifyContent: "center",
  },
  footerInner: {
    width: "100%",
    maxWidth: 720,
  },
  confirmBtn: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    background: "#061ffa",
    color: "white",
    fontSize: 16,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    letterSpacing: 0.3,
  },
  spinnerWhite: {
    width: 20,
    height: 20,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};