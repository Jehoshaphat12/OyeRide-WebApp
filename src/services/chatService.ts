import {
  ref,
  set,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp,
  push,
} from 'firebase/database';
import { database } from '../lib/firebase';

export interface ChatMessage {
  id: string;
  senderId: string;
  message: string;
  timestamp: any;
}

export class ChatService {
  /**
   * Send a message in a ride chat
   */
  static async sendMessage(rideId: string, senderId: string, message: string): Promise<void> {
    const chatRef = ref(database, `ride_chats/${rideId}/messages`);
    const newMsgRef = push(chatRef);
    await set(newMsgRef, {
      senderId,
      message: message.trim(),
      timestamp: serverTimestamp(),
    });
  }

  /**
   * Subscribe to ride chat messages (real-time)
   */
  static subscribeToChat(
    rideId: string,
    callback: (messages: ChatMessage[]) => void,
  ): () => void {
    const chatRef = ref(database, `ride_chats/${rideId}/messages`);
    const q = query(chatRef, orderByChild('timestamp'), limitToLast(100));

    const handler = onValue(q, (snapshot) => {
      if (snapshot.exists()) {
        const messages: ChatMessage[] = [];
        snapshot.forEach((child) => {
          messages.push({
            id: child.key as string,
            ...(child.val() as Omit<ChatMessage, 'id'>),
          });
        });
        callback(messages);
      } else {
        callback([]);
      }
    });

    return () => off(q, 'value', handler);
  }
}
