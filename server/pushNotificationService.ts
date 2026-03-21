import { storage } from "./storage";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: "default" | null;
  badge?: number;
}

/**
 * Send push notification to a specific user via Expo Push Service.
 * Works with expo-notifications on the mobile app.
 */
export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  const tokens = await storage.getPushTokensByUserId(userId);
  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: "default" as const,
  }));

  await sendExpoPush(messages);
}

/**
 * Send push notification to multiple users.
 */
export async function sendPushToUsers(
  userIds: number[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  for (const userId of userIds) {
    await sendPushToUser(userId, title, body, data);
  }
}

/**
 * Send messages via Expo Push Service API.
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo push API accepts batches of up to 100 messages
  const chunks = chunkArray(messages, 100);

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        console.error(
          "[PushNotification] Expo push failed:",
          response.status,
          await response.text(),
        );
      }
    } catch (err) {
      console.error("[PushNotification] Network error:", err);
    }
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
