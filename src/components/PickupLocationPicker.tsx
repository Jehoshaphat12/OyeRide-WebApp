import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons"; // your existing Icon component
import { getReadableLocationName } from "@/services/geocoding";
import MapPinPicker from "./MapPinPicker";
import { getRecentLocations, saveRecentLocation } from "@/utils/LocationStorage";




// ---------- Types ----------
export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pickup: LocationPoint) => void;
  initialPickup?: LocationPoint | null;
  userLocation?: { lat: number; lng: number } | null;
}

// ---------- Constants ----------
const GOOGLE_MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || "";

let autoService: any = null;
let geocoder: any = null;
let placesService: any = null;

function getGoogleServices() {
  if (window.google && !autoService) {
    autoService = new window.google.maps.places.AutocompleteService();
    geocoder = new window.google.maps.Geocoder();
    placesService = new window.google.maps.places.PlacesService(
      document.createElement("div"),
    );
  }
}

// ---------- Helpers ----------
const formatDistance = (meters?: number): string | null => {
  if (meters == null || meters === Infinity) return null;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
};

// ---------- Skeleton placeholder ----------
const PredictionSkeleton = () => {
  // simple pulse not needed, but we can keep it static
  return (
    <div style={s.skeletonContainer}>
      {[1, 2, 3, 4, 5].map((_, i) => (
        <div key={i} style={s.skeletonItem}>
          <div style={s.skeletonIcon} />
          <div style={s.skeletonTexts}>
            <div style={{ ...s.skeletonLine, width: "65%" }} />
            <div style={{ ...s.skeletonLine, width: "40%", marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------- Section header ----------
const SectionHeader = ({ label }: { label: string }) => (
  <div style={s.sectionHeader}>
    <span style={s.sectionTitle}>{label}</span>
  </div>
);

// ---------- Main component ----------
export default function PickupLocationPicker({
  visible,
  onClose,
  onConfirm,
  initialPickup,
  userLocation,
}: Props) {
  const [pickup, setPickup] = useState<LocationPoint | null>(
    initialPickup || null,
  );
  const [activeField, setActiveField] = useState<"pickup">("pickup");

  // UI states
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [predictionsWithDistance, setPredictionsWithDistance] = useState<any[]>(
    [],
  );

  const [pinPickerVisible, setPinPickerVisible] = useState(false);

  const skeletonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
  if (visible) {
    setRecentLocations(getRecentLocations());
  }
}, [visible]);

  // Auto-fill pickup from user location on first open
  useEffect(() => {
    if (!visible || pickup || !userLocation) return;
    getGoogleServices();
    const tryGeocode = async () => {
      if (!geocoder) return;
      geocoder.geocode(
        { location: { lat: userLocation.lat, lng: userLocation.lng } },
        (results: any[], status: string) => {
          let address = "";
          if (status === "OK" && results[0]) {
            address = results[0].formatted_address;
          }
          setPickup({
            latitude: userLocation.lat,
            longitude: userLocation.lng,
            address: address || "Current Location",
          });
        },
      );
    };
    const timer = setTimeout(tryGeocode, 200);
    return () => clearTimeout(timer);
  }, [visible, userLocation]);

  // Fetch predictions when input changes
  const searchPlaces = (input: string) => {
    if (!input.trim() || !autoService) {
      setPredictions([]);
      setPredictionsWithDistance([]);
      setShowSkeleton(false);
      return;
    }
    setShowSkeleton(true);
    if (skeletonTimeoutRef.current) clearTimeout(skeletonTimeoutRef.current);
    skeletonTimeoutRef.current = setTimeout(() => {
      const bias = userLocation
        ? {
            location: new window.google.maps.LatLng(
              userLocation.lat,
              userLocation.lng,
            ),
            radius: 50000,
          }
        : {};
      autoService.getPlacePredictions(
        { input, ...bias },
        async (preds: any[], status: string) => {
          if (status === "OK" && preds) {
            const withDist = await Promise.all(
              preds.map(async (pred) => {
                try {
                  const loc = await resolvePlace(pred);
                  const distance = userLocation
                    ? haversineKm(
                        userLocation.lat,
                        userLocation.lng,
                        loc.latitude,
                        loc.longitude,
                      )
                    : Infinity;
                  return { ...pred, distance, location: loc };
                } catch {
                  return { ...pred, distance: Infinity };
                }
              }),
            );
            withDist.sort((a, b) => a.distance - b.distance);
            setPredictionsWithDistance(withDist);
            setPredictions(preds);
          } else {
            setPredictionsWithDistance([]);
            setPredictions([]);
          }
          setShowSkeleton(false);
        },
      );
    }, 300);
  };

  const resolvePlace = (pred: any): Promise<LocationPoint> => {
    return new Promise((resolve, reject) => {
      if (!geocoder) {
        reject("No geocoder");
        return;
      }
      geocoder.geocode(
        { placeId: pred.place_id },
        (results: any[], status: string) => {
          if (status === "OK" && results[0]) {
            const loc = results[0].geometry.location;
            resolve({
              latitude: loc.lat(),
              longitude: loc.lng(),
              address: pred.description,
            });
          } else reject("Geocode failed");
        },
      );
    });
  };

  // Select a location
  // Select a location
  const handleSelectLocation = async (item: any) => {
    setLoading(true);
    try {
      let locationData: LocationPoint = {
        latitude: 0,
        longitude: 0,
        address: item.description || item.structured_formatting?.main_text,
      };
      if (item.latitude && item.longitude) {
        // Already a fully-resolved point (e.g. map pin, recent location).
        locationData = { ...locationData, latitude: item.latitude, longitude: item.longitude, address: item.address || item.description };
      } else if (item.location?.latitude && item.location?.longitude) {
        // Search predictions already carry resolved coords from searchPlaces()
        // (set via resolvePlace() while sorting by distance) — use them
        // directly instead of re-resolving.
        locationData = {
          latitude: item.location.latitude,
          longitude: item.location.longitude,
          address: item.structured_formatting?.main_text || item.description,
        };
      } else if (item.geometry?.location) {
        locationData = {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
          address: item.structured_formatting?.main_text || item.description,
        };
      } else if (item.place_id) {
        // Resolve via the JS SDK Geocoder (same approach as resolvePlace()
        // below) instead of a raw fetch() to the Place Details REST endpoint
        // — that REST call isn't reliably reachable from a browser (CORS)
        // and was failing silently here, leaving latitude/longitude at 0.
        try {
          const loc = await resolvePlace(item);
          locationData = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            address:
              item.structured_formatting?.main_text || item.description,
          };
        } catch (e) {
          console.error("Failed to resolve place coordinates:", e);
        }
      }
      if (locationData.latitude !== 0 || locationData.longitude !== 0) {
        saveRecentLocation(locationData);
      } else {
        console.warn(
          "Selected location has no resolved coordinates — gas station search and routing will not update for this pick.",
        );
      }
      setPickup(locationData);
      setPredictions([]);
      setPredictionsWithDistance([]);
      setNearbyPlaces([]);
    } catch (err) {
      console.error("Error selecting location:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinConfirm = (location: LocationPoint) => {
    setPinPickerVisible(false);
    handleSelectLocation(location);
  };

  // Determine result list state
  const hasPredictions = predictionsWithDistance.length > 0;
  const hasNearby = nearbyPlaces.length > 0;
  const hasRecent = recentLocations.length > 0;
  const showEmptyState =
    !showSkeleton && !hasPredictions && !hasNearby && !hasRecent;

  // haversine for distance calculation
  const haversineKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  if (!visible) return null;

  return (
    <div style={s.overlay}>
      <div style={s.screen}>
        {/* Header */}
        <div style={s.header}>
          <button style={s.backBtn} onClick={onClose}>
            <Icon name="close" size={22} color="#333" />
          </button>
          <h2 style={s.headerTitle}>Pickup location</h2>
          <button style={s.backBtn} onClick={() => setPinPickerVisible(true)}>
            <Icon name="map" size={22} color="#061ffa" />
          </button>
        </div>

        {/* Search bar */}
        <div style={s.searchCard}>
          <div style={s.searchRow}>
            <Icon
              name="location-outline"
              size={20}
              color="#061ffa"
              style={{ marginRight: 10 }}
            />
            <input
              style={s.searchInput}
              placeholder="Enter your pickup address"
              value={pickup?.address || ""}
              onFocus={() => setActiveField("pickup")}
              onChange={(e) => {
                const val = e.target.value;
                setPickup(val ? { ...pickup!, address: val } : null);
                searchPlaces(val);
              }}
            />
            {pickup?.address && (
              <button
                style={s.clearBtn}
                onClick={() => {
                  setPickup(null);
                  setPredictions([]);
                  setPredictionsWithDistance([]);
                }}
              >
                <Icon name="close-circle" size={20} color="#888" />
              </button>
            )}
          </div>
        </div>

        {/* Results area */}
        <div style={s.resultsContainer}>
          {loading ? (
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <span style={s.loadingText}>Fetching location details…</span>
            </div>
          ) : (
            <>
              {hasPredictions && (
                <div style={s.card}>
                  <SectionHeader label="Search results" />
                  {predictionsWithDistance.map((item, idx) => {
                    const dist = formatDistance(item.distance_meters);
                    return (
                      <button
                        key={idx}
                        style={s.resultItem}
                        onClick={() => handleSelectLocation(item)}
                      >
                        <div style={s.resultIcon}>
                          <Icon name="location" size={18} color="#061ffa" />
                        </div>
                        <div style={s.resultTexts}>
                          <div style={s.resultMain}>
                            {item.structured_formatting?.main_text ||
                              item.description}
                          </div>
                          <div style={s.resultSub}>
                            {item.structured_formatting?.secondary_text || ""}
                            {dist && (
                              <span style={s.distanceBadge}>{" • " + dist}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {showSkeleton && !hasPredictions && <PredictionSkeleton />}

              {!hasPredictions && !showSkeleton && hasNearby && (
                <div style={s.card}>
                  <SectionHeader label="Nearby" />
                  {nearbyPlaces.map((item, idx) => (
                    <button
                      key={`nearby-${idx}`}
                      style={s.resultItem}
                      onClick={() => handleSelectLocation(item)}
                    >
                      <div style={s.resultIcon}>
                        <Icon name="business" size={18} color="#061ffa" />
                      </div>
                      <div style={s.resultTexts}>
                        <div style={s.resultMain}>
                          {item.structured_formatting?.main_text}
                        </div>
                        <div style={s.resultSub}>
                          {item.structured_formatting?.secondary_text}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!hasPredictions && !showSkeleton && hasRecent && (
                <div style={s.card}>
                  <SectionHeader label="Recent" />
                  {recentLocations.map((item, idx) => (
                    <button
                      key={`recent-${idx}`}
                      style={s.resultItem}
                      onClick={() => handleSelectLocation(item)}
                    >
                      <div style={s.resultIcon}>
                        <Icon name="time" size={18} color="#888" />
                      </div>
                      <div style={s.resultTexts}>
                        <div style={s.resultMain}>{item.address}</div>
                        <div style={s.resultSub}>Recent location</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showEmptyState && (
                <div style={s.emptyState}>
                  <Icon name="search" size={44} color="#ccc" />
                  <h3 style={s.emptyTitle}>Can't find your location?</h3>
                  <p style={s.emptyText}>
                    Try a nearby landmark, junction, or market name. You can
                    also drop a pin directly on the map.
                  </p>
                  <button
                    style={s.mapCta}
                    onClick={() => setPinPickerVisible(true)}
                  >
                    <Icon name="map" size={18} color="white" />
                    <span style={s.mapCtaText}>Pick on map</span>
                  </button>
                </div>
              )}

              {!showEmptyState && (
                <button
                  style={s.mapRow}
                  onClick={() => setPinPickerVisible(true)}
                >
                  <Icon name="map-outline" size={20} color="#061ffa" />
                  <span style={s.mapRowText}>Drop a pin on the map</span>
                  <Icon name="chevron-forward" size={16} color="#061ffa" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Confirm footer */}
        {pickup && (
          <div style={s.footer}>
            <button
              style={s.confirmBtn}
              onClick={() => onConfirm(pickup)}
              disabled={!pickup.address}
            >
              Confirm pickup
            </button>
          </div>
        )}
      </div>

      <MapPinPicker
        visible={pinPickerVisible}
        onClose={() => setPinPickerVisible(false)}
        onConfirm={handlePinConfirm}
        initialRegion={
          userLocation
            ? {
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }
            : undefined
        }
      />
    </div>
  );
}

// ---------- Styles ----------
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "white",
    display: "flex",
    flexDirection: "column",
  },
  screen: { flex: 1, display: "flex", flexDirection: "column", height: "100%" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "40px 16px 10px",
    background: "white",
    flexShrink: 0,
  },
  backBtn: { border: "none", background: "none", cursor: "pointer", padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 600, color: "#333" },
  searchCard: {
    margin: "10px 16px",
    border: "1px solid #eee",
    borderRadius: 12,
    background: "#fff",
    padding: "4px",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 16,
    color: "#333",
    background: "transparent",
    padding: "4px 0",
  },
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    marginLeft: 8,
  },
  resultsContainer: {
    flex: 1,
    overflowY: "auto",
    paddingBottom: 16,
  },
  card: { marginLeft: 16, marginRight: 16, marginTop: 12 },
  sectionHeader: {
    padding: "10px 0",
    borderBottom: "1px solid #eee",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "#888",
  },
  resultItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 0",
    borderBottom: "1px solid #f5f5f5",
    background: "transparent",
    border: "none",
    width: "100%",
    cursor: "pointer",
    textAlign: "left",
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultTexts: { flex: 1, overflow: "hidden" },
  resultMain: {
    fontSize: 15,
    fontWeight: 500,
    color: "#333",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  resultSub: { fontSize: 12, color: "#888", marginTop: 2 },
  distanceBadge: { color: "#061ffa", fontWeight: 500 },
  skeletonContainer: { marginLeft: 16, marginRight: 16, marginTop: 12, gap: 12 },
  skeletonItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "12px 0",
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#f0f0f0",
  },
  skeletonTexts: { flex: 1 },
  skeletonLine: { height: 12, borderRadius: 6, background: "#f0f0f0" },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 60,
  },
  spinner: {
    width: 24,
    height: 24,
    border: "3px solid #eee",
    borderTop: "3px solid #061ffa",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#888" },
  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 30px",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 1.5,
    marginBottom: 24,
  },
  mapCta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 22px",
    background: "#061ffa",
    borderRadius: 20,
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  mapCtaText: { fontSize: 15, fontWeight: 600 },
  mapRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px 20px",
    marginLeft: 16,
    marginRight: 16,
    marginTop: 12,
    borderTop: "1px solid #eee",
    borderBottom: "1px solid #eee",
    background: "transparent",
    border: "none",
    width: "100%",
    cursor: "pointer",
  },
  mapRowText: { flex: 1, fontSize: 15, fontWeight: 500, color: "#061ffa" },
  footer: {
    padding: 16,
    borderTop: "1px solid #f0f0f0",
    background: "white",
  },
  confirmBtn: {
    width: "100%",
    padding: "16px",
    background: "#061ffa",
    color: "white",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
  },
};