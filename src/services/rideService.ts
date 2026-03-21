import { geohashForLocation } from 'geofire-common';
import { serverTimestamp } from 'firebase/firestore';
import { FirestoreService } from './firestoreService';
import { calculateFare } from '../lib/fareCalculator';
import { VehicleType, Ride } from '../types';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  address: string;
}

export class RideService {
  static async requestRide(
    passengerId: string,
    pickup: LocationPoint,
    destination: LocationPoint,
    vehicleType: VehicleType,
    details: {
      totalPrice: number;
      distance: number;
      duration: number;
      passengerName: string;
      passengerPhone: string;
      passengerPhoto?: string;
    },
    packageInfo?: any,
  ): Promise<string> {
    const geohash = geohashForLocation([pickup.latitude, pickup.longitude]);
    const fare = calculateFare(details.distance, vehicleType);

    // Build the ride object — never include undefined values (Firestore rejects them)
    const ride: Record<string, any> = {
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
      driverRating: 0,
      driverFeedback: '',
      driverFeedbackTags: [],
    };

    // Only add optional fields when they actually have a value
    if (details.passengerPhoto) ride.passengerPhotoUrl = details.passengerPhoto;
    if (packageInfo) ride.packageInfo = packageInfo;

    return await FirestoreService.createRide(ride as Partial<Ride>);
  }

  static subscribeToRide(rideId: string, callback: (ride: Ride | null) => void): () => void {
    return FirestoreService.subscribeToRide(rideId, callback);
  }
}
