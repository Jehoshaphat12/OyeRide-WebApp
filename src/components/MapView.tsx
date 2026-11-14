import React, { useCallback, useEffect, useRef } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

declare global {
  interface Window { google: any; initGoogleMaps: () => void; }
}

interface LatLng { lat: number; lng: number; }

interface MapViewProps {
  userLocation: LatLng | null;
  pickup?: { latitude: number; longitude: number; address: string } | null;
  destination?: { latitude: number; longitude: number; address: string } | null;
  driverLocation?: LatLng;
  onRouteReady?: (distance: number, duration: number) => void;
  showRoute?: boolean;
  travelMode: 'BICYCLING';
  trackingMode?: 'to_pickup' | 'to_destination' | null;
  /** Encoded polyline stored in ride doc — 0 cost for to_destination phase */
  rideRoutePolyline?: string | null;
}

// ── Google Maps loader (unchanged) ───────────────────────────────────────────
let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];
function loadGoogleMaps(callback: () => void) {
  if (mapsLoaded) { callback(); return; }
  mapsCallbacks.push(callback);
  if (mapsLoading) return;
  mapsLoading = true;
  window.initGoogleMaps = () => {
    mapsLoaded = true;
    mapsCallbacks.forEach(cb => cb());
    mapsCallbacks.length = 0;
  };
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
  script.async = true; script.defer = true;
  document.head.appendChild(script);
}

// ── Decode Google encoded polyline → [{lat, lng}] ────────────────────────────
function decodePolyline(encoded: string): LatLng[] {
  const poly: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return poly;
}

// ── Haversine distance (km) ───────────────────────────────────────────────────
function distKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// ── Fetch route once — only called 1x per tracking phase ─────────────────────
// async function fetchRoute(origin: LatLng, dest: LatLng): Promise<LatLng[] | null> {
//   return new Promise(resolve => {
//     if (!window.google) { resolve(null); return; }
//     const svc = new window.google.maps.DirectionsService();
//     svc.route(
//       { origin, destination: dest, travelMode: window.google.maps.TravelMode.DRIVING },
//       (result: any, status: any) => {
//         if (status === 'OK' && result.routes?.[0]?.overview_polyline?.points) {
//           resolve(decodePolyline(result.routes[0].overview_polyline.points));
//         } else resolve(null);
//       },
//     );
//   });
// }

async function fetchRoute(origin: LatLng, dest: LatLng): Promise<LatLng[] | null> {
  return new Promise(resolve => {
    if (!window.google) { resolve(null); return; }
    const svc = new window.google.maps.DirectionsService();
    svc.route(
      { origin, destination: dest, travelMode: window.google.maps.TravelMode.DRIVING },
      (result: any, status: any) => {
        if (status !== 'OK' || !result.routes?.[0]) {
          resolve(null);
          return;
        }
        const route = result.routes[0];
        const points: LatLng[] = [];
        for (const leg of route.legs) {
          for (const step of leg.steps) {
            if (step.polyline?.points) {
              points.push(...decodePolyline(step.polyline.points));
            }
          }
        }
        if (points.length === 0 && route.overview_polyline?.points) {
          resolve(decodePolyline(route.overview_polyline.points));
        } else {
          resolve(points.length ? points : null);
        }
      },
    );
  });
}

// ── Trim: remove waypoints the driver has already passed ─────────────────────
function trimPolyline(poly: LatLng[], driver: LatLng): LatLng[] {
  if (poly.length <= 2) return poly;
  let minDist = Infinity, closestIdx = 0;
  const scan = Math.min(poly.length, 30);
  for (let i = 0; i < scan; i++) {
    const d = distKm(driver, poly[i]);
    if (d < minDist) { minDist = d; closestIdx = i; }
  }
  return closestIdx > 0 ? poly.slice(closestIdx) : poly;
}

// ── Off-route check ───────────────────────────────────────────────────────────
function isOffRoute(poly: LatLng[], driver: LatLng, threshKm = 0.12): boolean {
  if (!poly.length) return false;
  let min = Infinity;
  const scan = Math.min(poly.length, 40);
  for (let i = 0; i < scan; i++) min = Math.min(min, distKm(driver, poly[i]));
  return min > threshKm;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MapView({
  userLocation, pickup, destination, driverLocation,
  onRouteReady, showRoute, travelMode, trackingMode, rideRoutePolyline,
}: MapViewProps) {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapInst      = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const destMarker   = useRef<any>(null);
  const userMarker   = useRef<any>(null);
  const driverMarker = useRef<any>(null);
  const dirRenderer  = useRef<any>(null);   // blue pickup→destination route
  const dirService   = useRef<any>(null);
  const routeDrawn   = useRef('');

  // ── Tracking state (replaces driverRouteRenderer — no DirectionsRenderer) ──
  const driverPolyline    = useRef<any>(null);  // google.maps.Polyline (static)
  const fullRouteRef      = useRef<LatLng[]>([]); // full fetched/decoded route
  const hasFetchedRef     = useRef(false);
  const hasAutoFittedRef  = useRef(false);
  const lastDeviationRef  = useRef(0);

  // Smooth marker animation
  const animFrameRef  = useRef<number | null>(null);
  const prevDriverPos = useRef<LatLng | null>(null);

  // ── Init map ─────────────────────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapRef.current || mapInst.current) return;
    const center = userLocation || { lat: 5.6037, lng: -0.187 };
    mapInst.current = new window.google.maps.Map(mapRef.current, {
      center, zoom: 15, disableDefaultUI: true, zoomControl: false,
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
        { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'water', stylers: [{ color: '#dde8f0' }] },
        { featureType: 'landscape', stylers: [{ color: '#f2f4f0' }] },
      ],
    });
    dirService.current = new window.google.maps.DirectionsService();
    dirRenderer.current = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: '#061ffa', strokeWeight: 4, strokeOpacity: 0.85 },
    });
    dirRenderer.current.setMap(mapInst.current);
  }, [userLocation]);

  useEffect(() => { loadGoogleMaps(initMap); }, []);

  // ── User location marker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current || !userLocation) return;
    if (!pickup && !destination) mapInst.current.panTo(userLocation);
    if (!userMarker.current) {
      userMarker.current = new window.google.maps.Marker({
        position: userLocation, map: mapInst.current,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#061ffa', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2.5 },
        zIndex: 10,
      });
    } else { userMarker.current.setPosition(userLocation); }
  }, [userLocation]);

  // ── Pickup marker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    if (pickup) {
      const pos = { lat: pickup.latitude, lng: pickup.longitude };
      if (!pickupMarker.current) {
        pickupMarker.current = new window.google.maps.Marker({ position: pos, map: mapInst.current, icon: createDotIcon('#061ffa', 'A'), zIndex: 20 });
      } else { pickupMarker.current.setPosition(pos); }
    } else { pickupMarker.current?.setMap(null); pickupMarker.current = null; }
  }, [pickup]);

  // ── Destination marker ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    if (destination) {
      const pos = { lat: destination.latitude, lng: destination.longitude };
      if (!destMarker.current) {
        destMarker.current = new window.google.maps.Marker({ position: pos, map: mapInst.current, icon: createDotIcon('#ff7300', 'B'), zIndex: 20 });
      } else { destMarker.current.setPosition(pos); }
    } else { destMarker.current?.setMap(null); destMarker.current = null; }
  }, [destination]);

  // ── Blue pickup→destination route (unchanged — called once on confirm) ───
  useEffect(() => {
    if (!mapInst.current || !dirService.current || !showRoute || !pickup || !destination) {
      if (!showRoute && dirRenderer.current) dirRenderer.current.setDirections({ routes: [] });
      return;
    }
    const key = `${pickup.latitude},${pickup.longitude}-${destination.latitude},${destination.longitude}`;
    if (key === routeDrawn.current) return;
    routeDrawn.current = key;
    dirService.current.route(
      { origin: { lat: pickup.latitude, lng: pickup.longitude }, destination: { lat: destination.latitude, lng: destination.longitude }, travelMode: window.google.maps.TravelMode.DRIVING },
      (result: any, status: any) => {
        if (status === 'OK') {
          dirRenderer.current.setDirections(result);
          const leg = result.routes[0].legs[0];
          onRouteReady?.(leg.distance.value / 1000, leg.duration.value / 60);
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend({ lat: pickup.latitude, lng: pickup.longitude });
          bounds.extend({ lat: destination.latitude, lng: destination.longitude });
          mapInst.current.fitBounds(bounds, { top: 100, bottom: 350, left: 40, right: 40 });
        }
      },
    );
  }, [pickup, destination, showRoute]);

  // ── Driver marker — smoothly animated ───────────────────────────────────
  useEffect(() => {
    if (!mapInst.current) return;
    if (!driverLocation) {
      driverMarker.current?.setMap(null);
      driverMarker.current = null;
      prevDriverPos.current = null;
      return;
    }
    if (!driverMarker.current) {
      driverMarker.current = new window.google.maps.Marker({
        position: driverLocation, map: mapInst.current,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="19" fill="#ff7300" stroke="white" stroke-width="2.5"/>
              <g transform="translate(9,12)" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none">
                <circle cx="4.5" cy="12" r="3"/><circle cx="19.5" cy="12" r="3"/>
                <path d="M16 4h2l3 5"/><path d="M9 4l1.5 3H5L4 9c-.5 1 .5 2 1.5 2h1"/>
                <path d="M9 4h7"/><path d="M12 4l3 5H9"/><path d="M16 9h3"/>
              </g>
            </svg>`),
          scaledSize: new window.google.maps.Size(42, 42),
          anchor: new window.google.maps.Point(21, 21),
        },
        zIndex: 30,
      });
      prevDriverPos.current = driverLocation;
      return;
    }
    // Smooth interpolation over 1 second using requestAnimationFrame
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const prev = prevDriverPos.current || driverLocation;
    const next = driverLocation;
    const startTime = performance.now();
    const DURATION = 1000;
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / DURATION, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out
      driverMarker.current?.setPosition({
        lat: prev.lat + (next.lat - prev.lat) * ease,
        lng: prev.lng + (next.lng - prev.lng) * ease,
      });
      if (t < 1) animFrameRef.current = requestAnimationFrame(animate);
      else prevDriverPos.current = next;
    };
    animFrameRef.current = requestAnimationFrame(animate);
  }, [driverLocation]);

  // ── Reset tracking state when mode changes ───────────────────────────────
  useEffect(() => {
    hasFetchedRef.current    = false;
    hasAutoFittedRef.current = false;
    fullRouteRef.current     = [];
    // Remove old driver polyline
    if (driverPolyline.current) {
      driverPolyline.current.setMap(null);
      driverPolyline.current = null;
    }
  }, [trackingMode]);

  // ── Fetch / decode route ONCE when tracking mode activates ───────────────
  useEffect(() => {
    if (!trackingMode || !driverLocation || !mapInst.current || hasFetchedRef.current) return;

    const initTracking = async () => {
      hasFetchedRef.current = true;
      let coords: LatLng[] | null = null;

      if (trackingMode === 'to_pickup' && pickup) {
        // ── 1 API call: driver → pickup ──────────────────────────────────
        coords = await fetchRoute(driverLocation, { lat: pickup.latitude, lng: pickup.longitude });
        if (!coords) coords = [driverLocation, { lat: pickup.latitude, lng: pickup.longitude }];

      } else if (trackingMode === 'to_destination') {
        // ── 0 API calls: decode stored polyline ──────────────────────────
        if (rideRoutePolyline) {
          coords = decodePolyline(rideRoutePolyline);
        } else if (pickup && destination) {
          coords = [{ lat: pickup.latitude, lng: pickup.longitude }, { lat: destination.latitude, lng: destination.longitude }];
        }
      }

      if (!coords || coords.length < 2) return;
      fullRouteRef.current = coords;
      drawDriverPolyline(coords);

      // Auto-fit once
      if (!hasAutoFittedRef.current) {
        hasAutoFittedRef.current = true;
        const target = trackingMode === 'to_pickup' ? pickup : destination;
        if (target) {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(driverLocation);
          bounds.extend({ lat: target.latitude, lng: target.longitude });
          mapInst.current.fitBounds(bounds, { top: 100, bottom: 380, left: 40, right: 40 });
        }
      }
    };

    initTracking();
  }, [trackingMode]);

  // ── Update polyline trim + deviation check as driver moves ───────────────
  useEffect(() => {
    if (!driverLocation || !trackingMode || fullRouteRef.current.length < 2) return;

    // Trim the route to show remaining portion
    const trimmed = trimPolyline(fullRouteRef.current, driverLocation);
    drawDriverPolyline(trimmed);

    // Deviation check — max once per 15s
    const now = Date.now();
    if (now - lastDeviationRef.current > 15000 && isOffRoute(fullRouteRef.current, driverLocation)) {
      lastDeviationRef.current = now;
      const target = trackingMode === 'to_pickup' ? pickup : destination;
      if (target) {
        fetchRoute(driverLocation, { lat: target.latitude, lng: target.longitude }).then(coords => {
          if (coords && coords.length > 1) {
            fullRouteRef.current = coords;
            drawDriverPolyline(coords);
          }
        });
      }
    }
  }, [driverLocation?.lat, driverLocation?.lng]);

  // ── Draw / update the static orange Polyline ────────────────────────────
  const drawDriverPolyline = (coords: LatLng[]) => {
    if (!mapInst.current) return;
    if (!driverPolyline.current) {
      driverPolyline.current = new window.google.maps.Polyline({
        path: coords,
        strokeColor: '#ff7300',
        strokeWeight: 4,
        strokeOpacity: 0.9,
        icons: [{
          icon: { path: window.google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 2.5, strokeColor: '#ff7300' },
          offset: '100%', repeat: '60px',
        }],
        map: mapInst.current,
        zIndex: 20,
      });
    } else {
      driverPolyline.current.setPath(coords);
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return <div ref={mapRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}

function createDotIcon(color: string, label: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="16" y="21" text-anchor="middle" fill="white" font-size="13" font-weight="bold" font-family="Arial">${label}</text>
    <line x1="16" y1="30" x2="16" y2="40" stroke="${color}" stroke-width="2.5"/>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new window.google.maps.Size(32, 40),
    anchor: new window.google.maps.Point(16, 40),
  };
}
