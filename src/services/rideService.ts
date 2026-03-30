import { 
  query, 
  collection, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  geohashForLocation, 
  geohashQueryBounds, 
  distanceBetween 
} from 'geofire-common';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { firestore } from '../lib/firebase'; // Adjust paths to your config
import { FirestoreService } from './firestoreService';
import { calculateFare } from '../lib/fareCalculator';
import { VehicleType, Ride, Driver } from '../types';

// Initialize Functions (Matching your mobile region)
const functions = getFunctions(app, "europe-west1");

// These helpers should be imported from your notification utility file
// import { sendPushToNearbyDrivers, addNotification } from '../lib/notifications';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
}

export class RideService {
  /**
   * Request a new ride and notify drivers
   */
  static async requestRide(
    passengerId: string,
    pickup: LocationPoint,
    destination: LocationPoint,
    vehicleType: VehicleType,
    details: any,
    packageInfo?: any,
  ): Promise<string> {
    const geohash = geohashForLocation([pickup.latitude, pickup.longitude]);
    const fare = calculateFare(details.distance, vehicleType);

    const rideData: Record<string, any> = {
      passengerId,
      passengerName: details.passengerName || '',
      passengerPhone: details.passengerPhone || '',
      vehicleType,
      status: 'requesting',
      pickup: {
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        address: pickup.address || '',
      },
      destinations: [
        {
          latitude: destination.latitude,
          longitude: destination.longitude,
          address: destination.address || '',
          sequence: 1,
        },
      ],
      geohash,
      distance: details.distance || 0,
      duration: details.duration || 0,
      totalFare: details.totalPrice || fare.totalFare,
      requestedAt: serverTimestamp(),
    };

    if (details.passengerPhoto) rideData.passengerPhotoUrl = details.passengerPhoto;
    if (packageInfo) rideData.packageInfo = packageInfo;

    const rideId = await FirestoreService.createRide(rideData as Partial<Ride>);

    // Trigger driver notification immediately after creation
    await this.notifyNearbyDrivers(pickup.latitude, pickup.longitude, rideId, vehicleType as any);

    return rideId;
  }

  /**
   * Find nearby drivers using geohash (Web Version)
   */
  /**
   * Find nearby drivers using geohash
   */
  static async findNearbyDrivers(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 2,
    vehicleType?: VehicleType,
  ): Promise<Driver[]> {
    try {
      const center: [number, number] = [centerLat, centerLng];
      const radiusInMeters = radiusKm * 1000;
      const bounds = geohashQueryBounds(center, radiusInMeters);

      const promises = bounds.map(([start, end]) => {
        const q = query(
          collection(firestore, "drivers"),
          where("geohash", ">=", start),
          where("geohash", "<=", end),
          where("isAvailable", "==", true),
          where("isOnline", "==", true),
          ...(vehicleType ? [where("vehicle.vehicleType", "==", vehicleType)] : []),
        );
        return getDocs(q);
      });

      const snapshots = await Promise.all(promises);
      const drivers: Driver[] = [];

      for (const snap of snapshots) {
        snap.forEach((docSnap) => {
          const driver = docSnap.data() as Driver;
          if (!driver?.currentLocation) return;

          const distKm = distanceBetween(center, [
            driver.currentLocation.latitude,
            driver.currentLocation.longitude,
          ]);

          if (distKm <= radiusKm) {
            drivers.push({ ...driver, id: docSnap.id, distance: distKm });
          }
        });
      }

      // De-duplicate and sort
      return Array.from(new Map(drivers.map((d) => [d.id, d])).values())
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } catch (error) {
      console.error("Find nearby drivers error:", error);
      return [];
    }
  }

  /**
   * Notify nearby drivers via Cloud Functions
   */
  static async notifyNearbyDrivers(
    centerLat: number,
    centerLng: number,
    rideId: string,
    vehicleType?: VehicleType,
    radiusKm: number = 3,
  ): Promise<{ totalFound: number; notified: number }> {
    try {
      const drivers = await this.findNearbyDrivers(centerLat, centerLng, radiusKm, vehicleType);
      
      // Filter for drivers with valid FCM tokens
      const eligibleDrivers = drivers.filter((d) => d.fcmToken);
      const driverTokens = eligibleDrivers.map((d) => d.fcmToken);

      if (driverTokens.length > 0) {
        const notifyNearby = httpsCallable(functions, "notifyNearbyDrivers");
        
        await notifyNearby({
          tokens: driverTokens,
          notification: {
            title: "New Ride Request 🚖",
            body: "A passenger nearby needs a ride",
          },
          extraData: {
            rideId: rideId,
            screen: "/(tabs)2", // Keeping the mobile-specific route or adjust for web
            type: "ride_request",
          },
        });
        console.log(`✅ Cloud Function: Notified ${driverTokens.length} drivers`);
      }

      return {
        totalFound: drivers.length,
        notified: eligibleDrivers.length,
      };
    } catch (error) {
      console.error("Error notifying nearby drivers:", error);
      return { totalFound: 0, notified: 0 };
    }
  }

  static subscribeToRide(rideId: string, callback: (ride: Ride | null) => void): () => void {
  return FirestoreService.subscribeToRide(rideId, callback);
}
}