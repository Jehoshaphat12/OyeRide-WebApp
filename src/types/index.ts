export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  photoUrl?: string;
  userType: 'passenger' | 'driver';
  rating: number;
  avatar?: string;
  createdAt: Date | any;
  totalRides?: number;
  fcmToken: string | null;
  pushToken: string | null;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  vehicle: {
    vehicleType: 'motor' | 'delivery' | 'bicycle_delivery';
    color: string;
    vehicleNumber: string;
    vehicleModel: string;
  };
  isAvailable: boolean;
  isOnline: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  };
  photoUrl: string;
  rating: number;
  totalTrips: number;
  geohash: string;
  lastUpdated: Date | any;
  distance: number;
  isVerified: boolean;
  fcmToken: string;
}

export interface Ride {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhotoUrl?: string;
  passengerRating?: number;
  driverId?: string;
  driver?: Driver;
  driverRating: number;
  driverFeedback: string;
  driverFeedbackTags: string[];
  vehicleType: 'motor' | 'delivery' | 'bicycle_delivery';
  status:
    | 'requesting'
    | 'accepted'
    | 'arriving'
    | 'arrived'
    | 'in_progress'
    | 'completed'
    | 'cancelled';
  pickup: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destinations: Array<{
    latitude: number;
    longitude: number;
    address: string;
    sequence: number;
  }>;
  geohash: string;
  packageInfo?: {
    recipientName: string;
    recipientPhone: string;
    itemDescription: string;
    image: string;
  };
  distance: number;
  duration: number;
  totalFare: number;
  requestedAt: Date | any;
  acceptedAt?: Date | any;
  startedAt?: Date | any;
  completedAt?: Date | any;
  currentLocation?: { latitude: number; longitude: number };
  polylinePoints?: Array<{ latitude: number; longitude: number }>;
  estimatedDuration?: number;
  userRating?: number;
  userFeedback?: string;
  feedbackTags?: string[];
}

export interface LiveTrackingData {
  driverId: string;
  rideId: string;
  location: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    accuracy: number;
  };
  timestamp: Date | any;
  distance: number;
}

export type VehicleType = 'motor' | 'delivery' | 'bicycle_delivery';

export type RideState =
  | 'idle'
  | 'picking_location'
  | 'confirming'
  | 'searching'
  | 'driver_assigned'
  | 'en_route'
  | 'completed';
