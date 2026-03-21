import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { Ride, User, Driver } from '../types';

export class FirestoreService {
  static async getUser(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  }

  static async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await setDoc(doc(firestore, 'users', userId), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  }

  static async getRide(rideId: string): Promise<Ride | null> {
    const rideDoc = await getDoc(doc(firestore, 'rides', rideId));
    return rideDoc.exists() ? (rideDoc.data() as Ride) : null;
  }

  static async createRide(ride: Partial<Ride>): Promise<string> {
    const rideRef = doc(collection(firestore, 'rides'));
    await setDoc(rideRef, {
      ...ride,
      id: rideRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return rideRef.id;
  }

  static async updateRide(rideId: string, data: Partial<Ride>): Promise<void> {
    await updateDoc(doc(firestore, 'rides', rideId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  static subscribeToRide(rideId: string, callback: (ride: Ride | null) => void): () => void {
    return onSnapshot(doc(firestore, 'rides', rideId), (snap) => {
      callback(snap.exists() ? (snap.data() as Ride) : null);
    });
  }

  static async getUserRides(userId: string): Promise<Ride[]> {
    const q = query(
      collection(firestore, 'rides'),
      where('passengerId', '==', userId),
      orderBy('requestedAt', 'desc'),
      limit(50),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as Ride);
  }

  static async getActiveRide(userId: string): Promise<Ride | null> {
    const q = query(
      collection(firestore, 'rides'),
      where('passengerId', '==', userId),
      where('status', 'in', ['requesting', 'accepted', 'arriving', 'arrived', 'in_progress']),
      orderBy('requestedAt', 'desc'),
      limit(1),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Ride;
  }

  static async getDriver(driverId: string): Promise<Driver | null> {
    const driverDoc = await getDoc(doc(firestore, 'drivers', driverId));
    return driverDoc.exists() ? (driverDoc.data() as Driver) : null;
  }

  static async cancelRide(rideId: string, reason?: string): Promise<void> {
    await updateDoc(doc(firestore, 'rides', rideId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelReason: reason || 'Passenger cancelled',
      updatedAt: serverTimestamp(),
    });
  }

  static async submitRating(
    rideId: string,
    rating: number,
    feedback: string,
    tags: string[],
  ): Promise<void> {
    await updateDoc(doc(firestore, 'rides', rideId), {
      userRating: rating,
      userFeedback: feedback,
      feedbackTags: tags,
      updatedAt: serverTimestamp(),
    });
  }
}
