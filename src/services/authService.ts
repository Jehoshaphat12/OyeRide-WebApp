import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';
import { User } from '../types';

export class AuthService {
  static async register(
    email: string,
    password: string,
    name: string,
    phone: string,
  ): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });

    const user: User = {
      id: userCredential.user.uid,
      email,
      name,
      phone,
      rating: 0.0,
      userType: 'passenger',
      fcmToken: null,
      pushToken: null,
      createdAt: new Date(),
    };

    await setDoc(doc(firestore, 'users', user.id), user);
    return user;
  }

  static async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
    if (!userDoc.exists()) throw new Error('User document not found');
    return userDoc.data() as User;
  }

  static async logout(): Promise<void> {
    await signOut(auth);
  }

  static async getUser(userId: string): Promise<User | null> {
    const userDoc = await getDoc(doc(firestore, 'users', userId));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  }

  static async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    await setDoc(doc(firestore, 'users', userId), updates, { merge: true });
  }

  static async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }
}
