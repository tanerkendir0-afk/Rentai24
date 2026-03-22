import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { apiRequest } from "@/lib/queryClient";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync();

  try {
    await apiRequest("POST", "/api/push-tokens", {
      token: token.data,
      platform: Platform.OS,
    });
  } catch {
    // Endpoint may not exist yet
  }

  return token.data;
}

export async function unregisterPushNotifications() {
  try {
    await apiRequest("DELETE", "/api/push-tokens");
  } catch {
    // ignore
  }
}
