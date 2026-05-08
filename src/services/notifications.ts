import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "@firebase/firestore";
import { firestore } from "../lib/firebase";
import { sendPushNotification } from "./sendPushNotifications";

export async function addNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  rideId?: string,
  screen?: string,
) {
  const notifRef = collection(firestore, "users", userId, "notifications");

  const firestoreWritePromise = await addDoc(notifRef, {
    type,
    title,
    body,
    rideId: rideId || null,
    screen: screen || null,
    createdAt: serverTimestamp(),
    read: false,
  });

  // Fetch user's fcmToken from Firestore
  const userDoc: any = await getDoc(doc(firestore, "users", userId));
  const mobileToken = userDoc.exists() ? userDoc.data().fcmToken : null;
  const webToken = userDoc.data()?.webFcmToken;

  const tokens = [mobileToken, webToken].filter(
  (t) => t && typeof t === 'string' && t.trim() !== ''
);

  // Send push notification if token exists
  if (tokens.length > 0) {
    for (const token of tokens) {
      await sendPushNotification(token, title, body, {
        rideId: rideId || "", // Ensure it's an empty string, not undefined
        screen: screen || "",
      });
    }
  }

  await firestoreWritePromise;
}
