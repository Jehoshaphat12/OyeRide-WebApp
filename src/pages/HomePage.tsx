import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FirestoreService } from '../services/firestoreService';
import { RideService } from '../services/rideService';
import { calculateFare } from '../lib/fareCalculator';
import { Ride, VehicleType, RideState } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import FullLocationPicker, { LocationPoint } from '../components/FullLocationPicker';
import RideTypeSheet, { RideOption } from '../components/RideTypeSheet';
import ConfirmRideSheet from '../components/ConfirmRideSheet';
import RideTrackingSheet from '../components/RideTrackingSheet';
import RideCompletedSheet from '../components/RideCompletedSheet';
import MapView from '../components/MapView';
import NotificationToastContainer from '../components/NotificationToast';
import NotificationBell from '../components/NotificationBell';
import { Icon } from '../components/Icons';
import NewUserPromoSheet from '../components/NewUserPromoSheet';
import { motion, useAnimation } from 'framer-motion';
import GasRefillSheet from '@/components/GasRefillSheet';
import { doc } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { sanitizeLocation } from '@/components/SanitizeLocation';

const PROMO_DISCOUNT = 0.10; // 10%
const PROMO_MAX_RIDES = 2;
const PROMO_STORAGE_KEY = 'oyeride_promo_shown';

const VEHICLE_ICONS: Record<string, string> = {
  motor: '/images/motor.png',
  delivery: '/images/box.png',
  bicycle_delivery: '/images/bicycle_delivery.png',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#4caf50', cancelled: '#f44336', requesting: '#061ffa',
  accepted: '#ff9800', in_progress: '#061ffa', default: '#888',
};

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    completed: 'Completed', cancelled: 'Cancelled', requesting: 'Active',
    accepted: 'Driver Assigned', in_progress: 'In Progress',
  };
  return map[status] || status;
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, toasts, permissionStatus, dismissToast,
    markAsRead, markAllAsRead, requestPermission, handleNotificationAction } = useNotifications();

  // ── Location & route state ──────────────────────────────────────────────────
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [stops, setStops] = useState<LocationPoint[]>([]);
  const [routeData, setRouteData] = useState<{ distance: number; duration: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [showPromoSheet, setShowPromoSheet] = useState(false);
  const [promoActive, setPromoActive] = useState(false);
  const [completedRideCount, setCompletedRideCount] = useState(0);

  const [gasRefillVisible, setGasRefillVisible] = useState(false);
  const [gasBookingData, setGasBookingData] = useState<any>(null);

  const controls = useAnimation();

  // ── Ride state ──────────────────────────────────────────────────────────────
  const [rideState, setRideState] = useState<RideState>('idle');
  const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [recentRides, setRecentRides] = useState<Ride[]>([]);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | undefined>();
  const rideUnsubRef = useRef<(() => void) | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setUserLocation({ lat: 5.6037, lng: -0.187 }),
    );
  }, []);

  useEffect(() => {
    if (permissionStatus === 'default') {
      const t = setTimeout(() => setShowNotifPrompt(true), 4000);
      return () => clearTimeout(t);
    }
  }, [permissionStatus]);

  useEffect(() => {
    if (!user?.id) return;
    FirestoreService.getUserRides(user.id)
      .then((rides) => {
        setRecentRides(rides.slice(0, 5));
        // Count completed rides to determine promo eligibility
        const completed = rides.filter((r) => r.status === 'completed').length;
        setCompletedRideCount(completed);
        const promoEligible = completed < PROMO_MAX_RIDES;
        setPromoActive(promoEligible);
        // Show promo popup once per session if eligible
        if (promoEligible) {
          const shownThisSession = sessionStorage.getItem(PROMO_STORAGE_KEY);
          if (!shownThisSession) {
            setTimeout(() => setShowPromoSheet(true), 1800);
          }
        }
      })
      .catch(() => {});
    FirestoreService.getActiveRide(user.id).then((ride) => {
      if (ride) resumeRide(ride);
    });
  }, [user?.id]);

  // ── Ride resumption ─────────────────────────────────────────────────────────
  const resumeRide = (ride: Ride) => {
    setCurrentRide(ride); setActiveRideId(ride.id);
    setPickup(ride.pickup);
    if (ride.destinations?.[0]) {
      const dest = ride.destinations[0];
      setDestination({ latitude: dest.latitude, longitude: dest.longitude, address: dest.address });
    }
    const statusMap: Record<string, RideState> = {
      requesting: 'searching', accepted: 'driver_assigned',
      arriving: 'driver_assigned', arrived: 'driver_assigned', in_progress: 'en_route',
    };
    const st = statusMap[ride.status];
    if (st) { setRideState(st); subscribeToRide(ride.id); }
    if (ride.driverId) fetchDriverInfo(ride.driverId);
  };

  const subscribeToRide = (rideId: string) => {
    rideUnsubRef.current?.();
    rideUnsubRef.current = FirestoreService.subscribeToRide(rideId, async (ride) => {
      if (!ride) return;
      setCurrentRide(ride);
      if (['accepted', 'arriving', 'arrived'].includes(ride.status)) {
        setRideState('driver_assigned');
        if (ride.driverId) fetchDriverInfo(ride.driverId);
        if (ride.driverId) {
          // Track driver location from Realtime DB
          const { database } = await import('../lib/firebase');
          const { ref, onValue, off } = await import('firebase/database');
          const locRef = ref(database, `driver_locations/${ride.driverId}`);
          const handler = onValue(locRef, (snap) => {
            if (snap.exists()) {
              const loc = snap.val().location;
              if (loc) setDriverLocation({ lat: loc.latitude, lng: loc.longitude });
            }
          });
          // Cleanup on ride end
          const cleanup = () => off(locRef, 'value', handler);
          const prevUnsub = rideUnsubRef.current;
          rideUnsubRef.current = () => { prevUnsub?.(); cleanup(); };
        }
      } else if (ride.status === 'in_progress') {
        setRideState('en_route');
        if (ride.driverId) {
          // Track driver location from Realtime DB
          const { database } = await import('../lib/firebase');
          const { ref, onValue, off } = await import('firebase/database');
          const locRef = ref(database, `driver_locations/${ride.driverId}`);
          const handler = onValue(locRef, (snap) => {
            if (snap.exists()) {
              const loc = snap.val().location;
              if (loc) setDriverLocation({ lat: loc.latitude, lng: loc.longitude });
            }
          });
          // Cleanup on ride end
          const cleanup = () => off(locRef, 'value', handler);
          const prevUnsub = rideUnsubRef.current;
          rideUnsubRef.current = () => { prevUnsub?.(); cleanup(); };
        }
      } else if (ride.status === 'completed') {
        setRideState('completed');
        rideUnsubRef.current?.(); setDriverLocation(undefined);
      } else if (ride.status === 'cancelled' &&  ride.cancelledBy === "driver") {
        alert('Your ride was cancelled by the driver.');
        resetRide();
      } else if (ride.status === 'cancelled' &&  ride.cancelledBy === "passenger") {
        alert('You have cancelled your ride.');
        resetRide();
      }
    });
  };

  const fetchDriverInfo = async (driverId: string) => {
    const driver = await FirestoreService.getDriver(driverId).catch(() => null);
    if (driver) setDriverInfo(driver);
  };

  const resetRide = useCallback(() => {
    rideUnsubRef.current?.();
    setRideState('idle'); setPickup(null); setDestination(null); setStops([]);
    setRouteData(null); setActiveRideId(null); setCurrentRide(null);
    setDriverInfo(null); setSelectedRide(null); setDriverLocation(undefined);
  }, []);

  // ── Location picker confirm ─────────────────────────────────────────────────
  const handleLocationConfirm = async (pickupLoc: LocationPoint, newStops: LocationPoint[]) => {

 // Sanitize pickup and all stops
  const sanitizedPickup = await sanitizeLocation(pickupLoc);
  const sanitizedStops = await Promise.all(newStops.map(s => sanitizeLocation(s)));

     setPickup(sanitizedPickup);
  setStops(sanitizedStops);
  setDestination(sanitizedStops[sanitizedStops.length - 1]);
  setLocationPickerVisible(false);
  setRideState('confirming');
  };

  // ── Ride type selected ──────────────────────────────────────────────────────
  const handleRideSelect = (ride: RideOption) => {
    setSelectedRide(ride);
    setRideState('confirming');
  };

  // ── Confirm booking ─────────────────────────────────────────────────────────
  const handleConfirmRide = async () => {
  if (!user || !pickup || !destination || !selectedRide) return;
  setIsLoading(true);
  try {

    // Sanitize pickup and all stops (including destination)
    const sanitizedPickup = await sanitizeLocation(pickup);
    const sanitizedStops = await Promise.all(stops.map(s => sanitizeLocation(s)));
    const sanitizedDestination = await sanitizeLocation(destination);

    // Update state (optional – improves UI consistency)
    setPickup(sanitizedPickup);
    setStops(sanitizedStops);
    setDestination(sanitizedDestination);


    const discountMultiplier = promoActive ? (1 - PROMO_DISCOUNT) : 1;

    const finalPrice = gasBookingData
      ? gasBookingData.totalFare   // already includes the two legs + fees
      : parseFloat((selectedRide.totalPrice * discountMultiplier).toFixed(2));

    const dist = gasBookingData
      ? gasBookingData.distanceToStation + gasBookingData.distanceBack
      : routeData?.distance || 0;

    const dur = routeData?.duration || 15;

    // Destinations: for gas refill use stops; for normal ride use [destination]
     // Build final destinations array from sanitized stops
    const finalDestinations = gasBookingData
      ? sanitizedStops.map(s => ({ latitude: s.latitude, longitude: s.longitude, address: s.address }))
      : [{ latitude: sanitizedDestination.latitude, longitude: sanitizedDestination.longitude, address: sanitizedDestination.address }];

    const rideId = await RideService.requestRide(
      user.id,
      sanitizedPickup,
      finalDestinations,             // ← now an array
      selectedRide.type as VehicleType,
      {
        totalPrice: finalPrice,
        distance: dist,
        duration: dur,
        passengerName: user.name || 'Passenger',
        passengerPhone: user.phone || '',
        promoDiscount: promoActive && !gasBookingData ? PROMO_DISCOUNT : 0,
        promoLabel: promoActive && !gasBookingData ? 'New Rider 10% Off' : undefined,
        // Gas refill metadata
        ...(gasBookingData ? {
          stationName: gasBookingData.station.name,
          stationAddress: gasBookingData.station.vicinity,
          stationLatitude: gasBookingData.station.latitude,
          stationLongitude: gasBookingData.station.longitude,
          cylinderSize: gasBookingData.cylinderSize,
          waitingFee: gasBookingData.fareBreakdown.find((b:any) => b.description.includes('Waiting'))?.amount ?? 5,
          serviceFee: gasBookingData.fareBreakdown.find((b:any) => b.description.includes('cylinder'))?.amount ?? 2,
          phase: 'heading_to_user',
        } : {}),
      },
    );

    setActiveRideId(rideId);
    setRideState('searching');
    subscribeToRide(rideId);
    sessionStorage.setItem(PROMO_STORAGE_KEY, '1');
    setGasBookingData(null);   // clean up
  } catch (e: any) {
    console.error('Booking error:', e);
    alert(`Booking failed: ${e?.message || 'Unknown error'}`);
  } finally { setIsLoading(false); }
};

  const handleCancelRide = async () => {
    if (activeRideId) await FirestoreService.cancelRide(activeRideId).catch(() => {});
    resetRide(); setCancelModalOpen(false);

    setGasBookingData(null);
setGasRefillVisible(false);
  };

  const handleRouteReady = useCallback((dist: number, dur: number) => {
    setRouteData({ distance: dist, duration: dur });
  }, []);

 const handleRatingSubmit = async (rating: number, feedback: string, tags: string[]) => {
  // Validation (activeRideId, driverId, rating range) …
  if (!activeRideId) throw new Error('No active ride');
  if (!currentRide?.driverId) throw new Error('No driver');

  try {
    // 1. Record the ride rating (outside transaction – optional but safer)
    await FirestoreService.submitRating(activeRideId, rating, feedback, tags);

    // 2. Atomically update driver and user documents
    await FirestoreService.runTransaction(async (transaction) => {
      const driverRef = doc(firestore, 'drivers', currentRide.driverId!);
      const userRef = doc(firestore, 'users', currentRide.driverId!);

      const driverSnap = await transaction.get(driverRef);
      if (!driverSnap.exists()) throw new Error('Driver not found');

      const driverData = driverSnap.data();
      const currentRating = driverData?.rating ?? 0;
      const totalRatings = driverData?.totalRatings ?? 0;
      const newTotal = totalRatings + 1;
      const newAvg = (currentRating * totalRatings + rating) / newTotal;
      const rounded = parseFloat(newAvg.toFixed(1));

      transaction.update(driverRef, {
        rating: rounded,
        totalRatings: newTotal,
      });
      transaction.update(userRef, {
        rating: rounded,
        // totalRatings: newTotal, // uncomment if needed
      });
    });

    resetRide();
  } catch (error) {
    console.error('Rating submission failed:', error);
    throw error; // let UI handle retry
  }
};

  const isActiveRide = ['searching', 'driver_assigned', 'en_route'].includes(rideState);
  const showBottomSheet = rideState === 'idle';
  const showRideTypes = rideState === 'confirming' && !selectedRide;
  const showConfirm = rideState === 'confirming' && !!selectedRide;
  const showTracking = isActiveRide;
  const showCompleted = rideState === 'completed';

  const handleGasRefillConfirm = async (bookingData: any) => {
  const effectivePickup = pickup ??
    (userLocation ? {
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      address: 'Current Location',
    } : null);

  if (!effectivePickup) {
    alert('Could not determine your location. Please wait or set a pickup address.');
    return;
  }

  // Sanitize all three location points
  const sanitizedPickup = await sanitizeLocation(effectivePickup);

  const stationStop = {
    latitude: bookingData.station.latitude,
    longitude: bookingData.station.longitude,
    address: bookingData.station.name,
  };
  const returnStop = {
    latitude: effectivePickup.latitude,
    longitude: effectivePickup.longitude,
    address: effectivePickup.address,
  };

  const sanitizedStation = await sanitizeLocation(stationStop);
  const sanitizedReturn = await sanitizeLocation(returnStop);

  setPickup(sanitizedPickup);
  setStops([sanitizedStation, sanitizedReturn]);
  setDestination(sanitizedReturn);

  const rideOption = {
    id: '5',
    slug: 'gas_refill',
    type: 'motor' as VehicleType,
    title: 'Gas Refill',
    image: '/images/motor.png',
    totalPrice: bookingData.totalFare,
    discountedPrice: bookingData.totalFare * (promoActive ? (1 - PROMO_DISCOUNT) : 1),
    eta: 'N/A',
    nearbyDrivers: 0,
    disabled: false,
    surgeInfo: { multiplier: 1, reason: 'Normal pricing', label: 'Normal', isActive: false },
  };

  setSelectedRide(rideOption);
  setGasBookingData(bookingData);
  setGasRefillVisible(false);
  setRideState('confirming');
};

  return (
    <div style={ss.screen}>
      {/* Map */}
      <MapView
        userLocation={userLocation}
        pickup={pickup}
        destination={destination}
        driverLocation={driverLocation}
        onRouteReady={handleRouteReady}
        showRoute={!!pickup && !!destination && !isActiveRide}
        travelMode='BICYCLING'
        trackingMode={
          rideState === 'driver_assigned' ? 'to_pickup' :
          rideState === 'en_route' ? 'to_destination' :
          null
        }
        rideRoutePolyline={currentRide?.routePolyline ?? null}
      />

      {/* Toast notifications */}
      <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} onAction={handleNotificationAction} />

      {/* Top bar */}
      <div style={ss.topBar}>
        {/* If active route selection: show cancel + trip info bar */}
        {rideState === 'confirming' && pickup && destination ? (
          <>
            <button style={ss.topBarBtn} onClick={() => { setRideState('idle'); setSelectedRide(null); }}>
              <Icon name="close" size={20} color="#333" />
            </button>
            <button style={ss.tripInfoBar} onClick={() => setLocationPickerVisible(true)}>
              <span style={ss.tripAddr} title={pickup.address}>{pickup.address}</span>
              <Icon name="arrow-right" size={14} color="#061ffa" style={{ flexShrink: 0 }} />
              <span style={ss.tripAddr} title={destination.address}>{destination.address}</span>
            </button>
            {stops.length < 3 && (
              <button style={ss.topBarBtn} onClick={() => setLocationPickerVisible(true)}>
                <Icon name="check" size={20} color="#333" />
              </button>
            )}
          </>
        ) : (
          <>
            <button style={ss.menuBtn} onClick={() => setSidebarOpen(true)}>
              <Icon name="menu" size={22} color="#333" />
            </button>
            {rideState === 'idle' && (
              <div style={ss.greetBubble}>
                <span style={ss.greetText}>Hi, {user?.name?.split(' ')[0] || 'Rider'} 👋</span>
              </div>
            )}
            {(showTracking || showCompleted) && (
              <div style={ss.statusPill}>
                <div style={{ ...ss.statusDot, background: rideState === 'en_route' ? '#4caf50' : rideState === 'completed' ? '#ff7300' : '#061ffa' }} />
                <span style={ss.statusText}>
                  {rideState === 'searching' ? 'Finding driver...' : rideState === 'driver_assigned' ? 'Driver assigned' : rideState === 'en_route' ? 'On the way' : 'Completed'}
                </span>
              </div>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <NotificationBell unreadCount={unreadCount} notifications={notifications}
                onMarkAllRead={markAllAsRead} onMarkRead={markAsRead} onAction={handleNotificationAction} />
            </div>
          </>
        )}
      </div>
      

      {/* ── HOME BOTTOM SHEET (idle state) ── */}
      {showBottomSheet && (
        <motion.div 
          drag="y"
          dragConstraints={{top: -40, bottom: 400}}
          dragElastic={0.1}
          initial={{y: "100%"}}
          animate={{y: 0}}
          exit={{ y: "100%" }}
        // Logic to snap back or close
        onDragEnd={(e, info) => {
          if (info.offset.y > 150) {
            // If dragged down far enough, you could hide it
            // or just let it snap back to bottom: 70
          }
        }}
        style={ss.homeSheet}>
          <div style={{ width: '100%', padding: '12px 0', cursor: 'grab' }}>
  <div style={ss.sheetHandle} />
</div>


          <div style={ss.sheetContent}>
          {/* Where to button */}
          <button style={ss.whereToBtn} onClick={() => setLocationPickerVisible(true)}>
            <div style={ss.whereDot} />
            <span style={ss.whereToText}>Where to?</span>
          </button>

          {/* Services section */}
          <div style={ss.sectionHeader}>
            <span style={ss.sectionTitle}>Services</span>
            <button style={ss.seeAllBtn}>
              <span style={ss.seeAllText}>See all</span>
              <Icon name="arrow-right" size={14} color="#aaa" />
            </button>
          </div>
          <div style={ss.servicesGrid}>
            {[
              { id: '1', name: 'Oye Motor',    img: '/images/motor.png',            info: 'Beat traffic', onPress: () => setLocationPickerVisible(true),  disabled: false },
              { id: '2', name: 'Oye Delivery', img: '/images/box.png',              info: 'Send items', onPress: () => setLocationPickerVisible(true),  disabled: false },
              { id: '3', name: 'Oye Bicycle',  img: '/images/bicycle_delivery.png', info: 'Eco delivery', onPress: () => setLocationPickerVisible(true), disabled: false },
              { id: '4', name: 'Gas Refill',     img: '/images/gas_icon.png',              info: 'Refill cylinder', onPress: () => {setGasRefillVisible(true); setRideState('confirming')},  disabled: false  },
              // { id: '5', name: 'Oye Ride',     img: '/images/car.png',              info: 'Coming soon', onPress: () => {},  disabled: true  },
            ].map((svc) => (
              <button
              key={svc.id}
              style={{ ...ss.serviceCard, opacity: svc.disabled ? 0.45 : 1 }}
              onClick={svc.disabled ? undefined: svc.onPress}
              disabled={svc.disabled}
              >
                <img src={svc.img} alt={svc.name} style={ss.serviceImg} />
                <span style={ss.serviceLabel}>{svc.name}</span>
                <span style={ss.serviceInfo}>{svc.info}</span>
              </button>
            ))}
          </div>

          {/* Recent trips */}
          {recentRides.length > 0 && (
            <>
              <div style={{ ...ss.sectionHeader, marginTop: 8 }}>
                <span style={ss.sectionTitle}>Recent Places</span>
                <button style={ss.seeAllBtn} onClick={() => navigate('/history')}>
                  <span style={ss.seeAllText}>See all</span>
                  <Icon name="arrow-right" size={14} color="#aaa" />
                </button>
              </div>
              <div style={ss.recentList}>
                {recentRides.map((ride) => {
                  const color = STATUS_COLORS[ride.status] || STATUS_COLORS.default;
                  const dest = ride.destinations?.[0];
                  return (
                    <button
                    key={ride.id}
                    style={ss.recentRow}
                      onClick={() => navigate('/history')}
                      >
                      <div style={ss.recentIconBox}>
                        <Icon name="clock" size={18} color="#888" />
                      </div>
                      <div style={ss.recentTexts}>
                        <span style={ss.recentDest} title={dest?.address}>
                          {dest?.address || '—'}
                        </span>
                        <span style={ss.recentFrom} title={ride.pickup?.address}>
                          {ride.pickup?.address || '—'}
                        </span>
                      </div>
                      <div style={{ ...ss.recentStatus, color, background: color + '22' }}>
                        {getStatusLabel(ride.status)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
                </div>
          <div style={{ height: 80 }} />
        </motion.div>
      )}

      {/* ── RIDE TYPE SELECTOR ── */}
      {showRideTypes && (
        <RideTypeSheet
          routeData={routeData || { distance: 0, duration: 0 }}
          pickup={pickup}
          destination={destination}
          onSelect={handleRideSelect}
          onCancel={() => { setRideState('idle'); setDestination(null); setPickup(null); setStops([]); }}
          onEditLocations={() => setLocationPickerVisible(true)}
          promoActive={promoActive}
        />
      )}

      {/* ── CONFIRM RIDE ── */}
      {showConfirm && selectedRide && (
  <ConfirmRideSheet
    pickup={pickup!}
    destination={destination!}
    vehicleType={selectedRide.type as VehicleType}
    fare={gasBookingData
      ? {
          // Gas refill total is already final (computed by calculateGasRefillFare
          // in GasRefillSheet) — do NOT recompute via calculateFare(), which
          // would run the normal motorbike formula on a stale/0 distance and
          // clamp to the minimum-fare floor instead.
          totalFare: gasBookingData.totalFare,
          baseFare: 0,
          distanceFare: 0,
        }
      : calculateFare(routeData?.distance || 0, selectedRide.type as VehicleType, selectedRide.surgeInfo?.multiplier || 1)}
    routeData={gasBookingData
      ? {
          // Gas refill distance/duration is the station round-trip, not the
          // leftover normal-ride routeData (which is stale/0 for this flow).
          distance: gasBookingData.distanceToStation + gasBookingData.distanceBack,
          duration: routeData?.duration || 15,
        }
      : (routeData || { distance: 0, duration: 0 })}
    onConfirm={handleConfirmRide}
    onBack={gasBookingData ? () => {
      // Back to gas refill sheet
      setSelectedRide(null);
      setGasBookingData(null);
      setGasRefillVisible(true);
      setRideState('idle');
    } : () => setSelectedRide(null)}
    isLoading={isLoading}
    promoDiscount={promoActive ? PROMO_DISCOUNT : 0}
    isGasRefill={!!gasBookingData}
    rideTitle={gasBookingData ? 'Gas Refill' : undefined}
    destinationLabel={gasBookingData
      ? `${gasBookingData.station.name} → Return`
      : undefined}
    gasFareBreakdown={gasBookingData?.fareBreakdown}
  />
)}

      {/* ── NEW USER PROMO SHEET ── */}
      <NewUserPromoSheet
        visible={showPromoSheet && rideState === 'idle'}
        onClose={() => {
          setShowPromoSheet(false);
          sessionStorage.setItem(PROMO_STORAGE_KEY, '1');
        }}
        onBookNow={() => {
          setShowPromoSheet(false);
          sessionStorage.setItem(PROMO_STORAGE_KEY, '1');
          setLocationPickerVisible(true);
        }}
      />

      {/* ── TRACKING ── */}
      {showTracking && (
        <RideTrackingSheet
          rideState={rideState}
          ride={currentRide}
          driverInfo={driverInfo}
          onCancel={() => setCancelModalOpen(true)}
        />
      )}

      {/* ── COMPLETED ── */}
      {showCompleted && currentRide && (
        <RideCompletedSheet
          ride={currentRide}
          driverInfo={driverInfo}
          onSubmitRating={handleRatingSubmit}
          onDismiss={resetRide}
        />
      )}

      {/* Cancel modal */}
      {cancelModalOpen && (
        <div style={ss.cancelOverlay} onClick={() => setCancelModalOpen(false)}>
          <div style={ss.cancelModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={ss.cancelTitle}>Cancel Ride?</h3>
            <p style={ss.cancelText}>Are you sure? A cancellation fee may apply if a driver was assigned.</p>
            <div style={ss.cancelBtns}>
              <button style={ss.keepBtn} onClick={() => setCancelModalOpen(false)}>Keep Ride</button>
              <button style={ss.confirmCancelBtn} onClick={handleCancelRide}>
                {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification permission prompt */}
      {showNotifPrompt && permissionStatus === 'default' && (
        <div style={ss.notifPrompt}>
          <div style={ss.notifPromptIconBox}><Icon name="bell" size={20} color="#061ffa" /></div>
          <div style={ss.notifPromptTexts}>
            <div style={ss.notifPromptTitle}>Enable Notifications</div>
            <div style={ss.notifPromptSub}>Get instant alerts when your driver is found</div>
          </div>
          <button style={ss.notifAllowBtn} onClick={async () => { setShowNotifPrompt(false); await requestPermission(); }}>Allow</button>
          <button style={ss.notifDismissBtn} onClick={() => setShowNotifPrompt(false)}>
            <Icon name="close" size={12} color="#888" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Full location picker */}
      <FullLocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onConfirm={handleLocationConfirm}
        initialPickup={pickup}
        initialStops={stops}
        userLocation={userLocation}
      />

      {/* Gas refill booking sheet */}
      {gasRefillVisible && (
  <GasRefillSheet
    visible={gasRefillVisible}
    onClose={() => {
      setGasRefillVisible(false);
      setRideState('idle');
      // if we came from the idle screen and no destination was set, do nothing else
    }}
    pickup={pickup}
    onPickupChange={(newPickup) => setPickup(newPickup)}
    onConfirm={handleGasRefillConfirm}
    userLocation={userLocation}
  />
)}

      {/* Bottom nav only on idle */}
      {rideState === 'idle' && <BottomNav active="home" />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}

const ss: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none',
  },
  menuBtn: {
    width: 44, height: 44, borderRadius: 12, background: 'white',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'all',
  },
  topBarBtn: {
    width: 40, height: 40, borderRadius: '50%', background: 'white',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, pointerEvents: 'all',
  },
  tripInfoBar: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
    background: 'white', borderRadius: 12, padding: '10px 14px',
    border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
    pointerEvents: 'all', overflow: 'hidden',
  },
  tripAddr: { fontSize: 12, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: "'Poppins', sans-serif" },
  greetBubble: { background: 'white', borderRadius: 12, padding: '10px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', pointerEvents: 'none' },
  greetText: { fontSize: 14, fontWeight: 600, color: '#333' },
  statusPill: { background: 'white', borderRadius: 20, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  statusText: { fontSize: 13, fontWeight: 600, color: '#333' },

  // Home bottom sheet
  homeSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    background: 'white', borderRadius: '24px 24px 0 0',
    padding: '0 0 0 0', boxShadow: '0 -4px 30px rgba(0,0,0,0.12)',
    zIndex: 200, height: '68%', display: "flex", flexDirection: "column",
    touchAction: "none"
  },
  sheetHandle: { width: 40, height: 4, background: '#ddd', borderRadius: 2, margin: '12px auto 0' },

  sheetContent: {
  flex: 1,
    overflowY: 'auto',
    paddingBottom: 80, // Space for BottomNav
    touchAction: 'pan-y',
  },

  // Where to
  whereToBtn: {
    display: 'flex', alignItems: 'center', gap: 12, margin: '16px 20px 20px',
    background: '#e2e2e2', borderRadius: 14, padding: '16px 18px',
    border: 'none', cursor: 'pointer', width: 'calc(100% - 40px)', textAlign: 'left',
  },
  whereDot: { width: 10, height: 10, borderRadius: '50%', background: '#061ffa', flexShrink: 0 },
  whereToText: { fontSize: 17, color: '#333', fontFamily: "'Poppins', sans-serif", fontWeight: 600 },

  // Services
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#333', fontFamily: "'Poppins', sans-serif" },
  seeAllBtn: { display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' },
  seeAllText: { fontSize: 13, color: '#aaa', fontFamily: "'Poppins', sans-serif" },
  servicesGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px', marginBottom: 20 },
  serviceCard: {
    background: '#e2e2e2', borderRadius: 16, padding: 16, border: 'none', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', height: 140,
    justifyContent: 'center', transition: 'transform 0.15s',
  },
  serviceImg: { width: 88, height: 56, objectFit: 'contain', marginBottom: 8 },
  serviceLabel: { fontSize: 14, fontWeight: 600, color: '#333', fontFamily: "'Poppins', sans-serif", textAlign: 'center' },
  serviceInfo: { fontSize: 12, color: '#888', fontFamily: "'Poppins', sans-serif", marginTop: 2 },

  // Recent trips
  recentList: { display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px' },
  recentRow: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
    background: '#f8f8f8', borderRadius: 14, border: 'none', cursor: 'pointer', textAlign: 'left',
  },
  recentIconBox: { width: 40, height: 40, borderRadius: 12, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recentTexts: { flex: 1, overflow: 'hidden' },
  recentDest: { fontSize: 14, fontWeight: 600, color: '#333', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Poppins', sans-serif" },
  recentFrom: { fontSize: 12, color: '#aaa', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, fontFamily: "'Poppins', sans-serif" },
  recentStatus: { padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: "'Poppins', sans-serif" },

  // Cancel modal
  cancelOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', padding: 16 },
  cancelModal: { background: 'white', borderRadius: 20, padding: 24, width: '100%', animation: 'slideUp 0.3s ease' },
  cancelTitle: { fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#333' },
  cancelText: { fontSize: 14, color: '#666', lineHeight: 1.5, marginBottom: 20 },
  cancelBtns: { display: 'flex', gap: 12 },
  keepBtn: { flex: 1, padding: 14, borderRadius: 12, background: '#f0f0f0', border: 'none', fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#333' },
  confirmCancelBtn: { flex: 1, padding: 14, borderRadius: 12, background: '#f44336', border: 'none', fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'white' },

  // Notification prompt
  notifPrompt: { position: 'absolute', bottom: 80, left: 12, right: 12, background: 'white', borderRadius: 16, padding: '14px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', zIndex: 400, border: '1.5px solid #e8edff', animation: 'slideUp 0.3s ease' },
  notifPromptIconBox: { width: 36, height: 36, borderRadius: 10, background: '#e8edff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifPromptTexts: { flex: 1 },
  notifPromptTitle: { fontSize: 13, fontWeight: 700, color: '#333' },
  notifPromptSub: { fontSize: 11, color: '#888', marginTop: 1 },
  notifAllowBtn: { padding: '8px 14px', borderRadius: 10, background: '#061ffa', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", flexShrink: 0 },
  notifDismissBtn: { background: '#f0f0f0', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
};
