import { getFunctions, httpsCallable } from "@firebase/functions";
import app from "../lib/firebase";

const functions = getFunctions(app, "europe-west1");

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data: any = {},
) {
  try {
    const sendNotification = httpsCallable(functions, "sendPushNotification");

    const result = await sendNotification({
      token,
      notification: { title, body },
      extraData: {
        screen: data.screen || "",
        rideId: data.rideId || "",
        type: data.type || "",
      },
    });
    return result.data; // This returns { success: true, messageId }
  } catch (error) {
    console.error("Push notification error:", error);
    throw error;
  }
}

export async function sendPushToNearbyDrivers(
  tokens: string[],
  title: string,
  body: string,
  data: any = {},
) {
  try {
    const sendNotification = httpsCallable(functions, "notifyNearbyDrivers");

    const result = await sendNotification({
      tokens, // This is now the array [token1, token2, ...]
      notification: {
        title,
        body,
      },
      extraData: {
        screen: data.screen || "",
        rideId: data.rideId || "",
        type: data.type || "",
      },
    });
    return result.data; // This returns { success: true, messageId }
  } catch (error) {
    console.error("Push notification error:", error);
    throw error;
  }
}
