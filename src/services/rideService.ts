// 📁 services/rideService.ts (Web)

import {
  query,
  collection,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  geohashForLocation,
  geohashQueryBounds,
  distanceBetween,
} from "geofire-common";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { firestore } from "../lib/firebase";
import { FirestoreService } from "./firestoreService";
import { calculateFare } from "../lib/fareCalculator";
import { VehicleType, Ride, Driver } from "../types";
import { addNotification } from "./notifications";
// If you have a directions helper, import it:
// import { getDirections } from "../api/maps/directions";

const functions = getFunctions(app, "europe-west1"); // match your region

// ── Helpers (can be placed in a separate file) ─────────────────────────────
async function adjustSurgeCounter(delta: 1 | -1): Promise<void> {
  // If you use Realtime Database for surge counters, implement similarly to the mobile version.
  // For now we leave a placeholder – non‑critical.
  // try {
  //   const { ref, runTransaction: rtTransaction } = await import("firebase/database");
  //   const { database } = await import("../lib/firebase");
  //   const counterRef = ref(database, "surge_counters/requesting");
  //   await rtTransaction(counterRef, (current: number | null) => {
  //     const next = (current ?? 0) + delta;
  //     return next < 0 ? 0 : next;
  //   });
  // } catch {}
}

// ── RideService Class ───────────────────────────────────────────────────────
export class RideService {
  /**
   * Server‑side promo validation – ensures only eligible users get the discount.
   */
  static async calculateVerifiedFare(
    passengerId: string,
    clientTotalPrice: number,
    clientPromoDiscount: number,
  ): Promise<number> {
    if (!clientPromoDiscount || clientPromoDiscount <= 0) return clientTotalPrice;

    try {
      const PROMO_DISCOUNT = 0.1;
      const PROMO_MAX_RIDES = 2;

      // Limit to PROMO_MAX_RIDES – we only need to know if count >= threshold
      const completedSnap = await getDocs(
        query(
          collection(firestore, "rides"),
          where("passengerId", "==", passengerId),
          where("status", "==", "completed"),
          // limit(PROMO_MAX_RIDES)  // Uncomment when available in your Firestore version
        ),
      );
      const completedCount = completedSnap.size;

      if (completedCount < PROMO_MAX_RIDES) {
        const basePrice = clientTotalPrice / (1 - clientPromoDiscount);
        return parseFloat((basePrice * (1 - PROMO_DISCOUNT)).toFixed(2));
      }

      // User not eligible → remove discount
      const basePrice = clientTotalPrice / (1 - clientPromoDiscount);
      return parseFloat(basePrice.toFixed(2));
    } catch {
      return clientTotalPrice;
    }
  }

  /**
   * Request a new ride.
   *
   * @param destinations – array of stops (for gas refill: [station, return]).
   * @param gasRefillData – metadata for the gas refill service.
   */
  static async requestRide(
    passengerId: string,
    pickup: { latitude: number; longitude: number; address: string },
    destinations: Array<{
      latitude: number;
      longitude: number;
      address: string;
    }>,
    vehicleType: VehicleType,
    details: {
      totalPrice: number;
      distance: number;
      duration: number;
      passengerName: string;
      passengerPhone: string;
      passengerPhoto?: string;
      passengerRating?: number;
      promoDiscount?: number;
      promoLabel?: string;
      // Gas refill specific fields will be forwarded in gasRefillData
      [key: string]: any;
    },
    packageDetails?: any,
    promoCode?: string | null,
    // optional pre‑computed fare (not used here – we recalculate server‑side)
    _totalFare?: number,
    gasRefillData?: {
      stationName: string;
      stationAddress: string;
      stationLatitude: number;
      stationLongitude: number;
      cylinderSize: "small" | "large";
      waitingFee: number;
      serviceFee: number;
      phase?: string;
    },
  ): Promise<string> {
    try {
      const geohash = geohashForLocation([pickup.latitude, pickup.longitude]);

      // ── Optional: fetch route polyline ──────────────────────────────────
      // const route = await getDirections(pickup, destinations[destinations.length-1],
      //   destinations.length > 1 ? destinations.slice(0, -1) : undefined);
      // const bestRoute = route.routes[0];
      // const polylinePoints = decodePolyline(bestRoute.overview_polyline.points);
      // const routePolyline = bestRoute.overview_polyline.points;

      // Build the ride document
      const rideData: Partial<Ride> = {
        passengerId,
        passengerName: details.passengerName || "",
        passengerPhone: details.passengerPhone || "",
        vehicleType,
        status: "requesting",
        pickup,
        destinations: destinations.map((dest, index) => ({
          ...dest,
          sequence: index + 1,
        })),
        geohash,
        distance: details.distance,
        duration: details.duration,
        totalFare: await RideService.calculateVerifiedFare(
          passengerId,
          details.totalPrice,
          details.promoDiscount || 0,
        ),
        requestedAt: new Date(),
        passengerPhotoUrl: details.passengerPhoto ?? undefined,
        passengerRating: details.passengerRating || 0,
        // Surge info (if provided)
        ...(details.surgeMultiplier && details.surgeMultiplier > 1
          ? {
              surgeMultiplier: details.surgeMultiplier,
              surgeReason: details.surgeReason || "",
            }
          : {}),
        // Gas refill metadata
        ...(gasRefillData ? { gasRefill: gasRefillData } : {}),
        // Package info (for delivery)
        ...(packageDetails &&
        (vehicleType === "delivery" || vehicleType === "bicycle_delivery")
          ? {
              packageInfo: {
                recipientName: packageDetails.recipientName || "",
                recipientPhone: packageDetails.recipientPhone || "",
                itemDescription: packageDetails.itemDescription || "",
                image: packageDetails.image || null,
                
              },
            }
          : {}),
        // Promo
        promoDiscount: details.promoDiscount || 0,
        promoLabel: details.promoLabel || undefined,
        // Polyline (if available)
        // polylinePoints,
        // routePolyline,
        // paymentMethod moved into packageInfo to match Ride type
        createdAt: new Date(),
        // Additional fields for ride lifecycle
        pickedUpAt: null,
        riderLocation: null,
        cancellationReason: null,
        cancelledBy: null,
        cancelledAt: null,
        passengerFeedback: null,
        riderRating: null,
        riderFeedback: null,
        paymentMethod: "cash",
      };

      const rideId = await FirestoreService.createRide(rideData as Ride);

      // Increment surge counter (placeholder)
      await adjustSurgeCounter(1);

      // Notify nearby drivers & admins
      await this.notifyNearbyDrivers(
        pickup.latitude,
        pickup.longitude,
        rideId,
        vehicleType as any,
      );
      await this.notifyAdminsOfNewRide(rideId, rideData);

      // If you use Realtime Database for ride status, update it here
      // await RealtimeService.updateRideStatus(rideId, "requesting");

      return rideId;
    } catch (error) {
      console.error("Request ride error:", error);
      throw error;
    }
  }

  // ── Driver finding & notification (unchanged from your original web) ──
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
          ...(vehicleType
            ? [where("vehicle.vehicleType", "==", vehicleType)]
            : []),
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

      return Array.from(new Map(drivers.map((d) => [d.id, d])).values()).sort(
        (a, b) => (a.distance || 0) - (b.distance || 0),
      );
    } catch (error) {
      console.error("Find nearby drivers error:", error);
      return [];
    }
  }

  static async notifyNearbyDrivers(
    centerLat: number,
    centerLng: number,
    rideId: string,
    vehicleType?: VehicleType,
    radiusKm: number = 3,
  ): Promise<{ totalFound: number; notified: number }> {
    try {
      const drivers = await this.findNearbyDrivers(centerLat, centerLng, radiusKm, vehicleType);
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
            rideId,
            screen: "/(tabs)2", // or web equivalent
            type: "ride_request",
          },
        });
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

  static async notifyAdminsOfNewRide(
    rideId: string,
    rideData: Partial<Ride>,
  ): Promise<void> {
    try {
      const adminUsers = await FirestoreService.getAdminUsers();
      if (adminUsers.length === 0) return;

      const pickupAddress =
        rideData.pickup?.address?.split(",")[0] || "Unknown location";
      const passengerName = rideData.passengerName || "A passenger";
      const title = "🆕 New Ride Request";
      const body = `${passengerName} requested a ride from ${pickupAddress}`;

      await Promise.allSettled(
        adminUsers.map((admin: any) =>
          addNotification(
            admin.id,
            "ride_request",
            title,
            body,
            rideId,
            "/admin/rides",
          ),
        ),
      );

      const validTokens = adminUsers
        .map((a: any) => a.fcmToken)
        .filter((t: any) => t && typeof t === "string" && t.trim() !== "");

      if (validTokens.length > 0) {
        const notifyNearby = httpsCallable(functions, "notifyNearbyDrivers");
        await notifyNearby({
          tokens: validTokens,
          notification: { title, body },
          extraData: {
            rideId,
            screen: "/admin/rides",
            type: "admin_ride_notification",
          },
        });
      }
    } catch (error) {
      console.warn("Failed to notify admins (non-critical):", error);
    }
  }

  // ── Ride lifecycle helpers (from mobile, adapted) ───────────────────────
  static async acceptRide(rideId: string, driverId: string): Promise<void> {
    // Similar to mobile version – implement if needed
  }

  static async completeRide(rideId: string, finalFare?: number): Promise<void> {
    // Similar to mobile version – implement if needed
  }

  static async cancelRide(
    rideId: string,
    userId: string,
    data: { reason: string; details: string; reasonId: string; cancelledBy?: string },
  ): Promise<void> {
    try {
      const ride = await FirestoreService.getRide(rideId);
      if (!ride) throw new Error("Ride not found");

      await runTransaction(firestore, async (transaction: any) => {
        const rideRef = doc(firestore, "rides", rideId);
        transaction.update(rideRef, {
          status: "cancelled",
          cancelledAt: serverTimestamp(),
          cancelledBy: ride.passengerId === userId ? "passenger" : "driver",
          cancellationReason: data.reason,
          cancellationDetails: data.details,
          cancellationReasonId: data.reasonId,
        });

        if (ride.driverId) {
          const driverRef = doc(firestore, "drivers", ride.driverId);
          transaction.update(driverRef, {
            isAvailable: true,
            currentRideId: null,
          });
        }
      });

      // Adjust surge counter if it was still in "requesting"
      if (ride.status === "requesting") {
        await adjustSurgeCounter(-1);
      }
    } catch (error) {
      console.error("Cancel ride error:", error);
      throw error;
    }
  }

  static subscribeToRide(
    rideId: string,
    callback: (ride: Ride | null) => void,
  ): () => void {
    return FirestoreService.subscribeToRide(rideId, callback);
  }

  // ── Other helpers (placeholder) ──────────────────────────────────────
  static async getRide(rideId: string): Promise<Ride | null> {
    return FirestoreService.getRide(rideId);
  }

  static async getActiveRides(
    userId: string,
    // userType: "passenger" | "driver",
  ): Promise<Ride[]> {
    return FirestoreService.getUserRides(userId);
  }
}