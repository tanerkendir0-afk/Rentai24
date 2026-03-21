import React, { useState, useEffect } from "react";
import { View, Text, Switch, Alert, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { apiRequest } from "@/lib/queryClient";

export default function NotificationsScreen() {
  const [pushEnabled, setPushEnabled] = useState(false);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [taskNotifications, setTaskNotifications] = useState(true);

  useEffect(() => {
    checkPermission();
    loadPreferences();
  }, []);

  const checkPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPushEnabled(status === "granted");
  };

  const loadPreferences = async () => {
    const chat = await SecureStore.getItemAsync("chatNotifications");
    const task = await SecureStore.getItemAsync("taskNotifications");
    if (chat !== null) setChatNotifications(chat === "true");
    if (task !== null) setTaskNotifications(task === "true");
  };

  const togglePush = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === "granted") {
        setPushEnabled(true);
        const token = await Notifications.getExpoPushTokenAsync();
        try {
          await apiRequest("POST", "/api/push-tokens", {
            token: token.data,
            platform: Platform.OS,
          });
        } catch {
          // Token registration may fail if endpoint doesn't exist yet
        }
      } else {
        Alert.alert(
          "Permission Required",
          "Please enable notifications in your device settings.",
        );
      }
    } else {
      setPushEnabled(false);
    }
  };

  const togglePreference = async (key: string, value: boolean) => {
    await SecureStore.setItemAsync(key, value.toString());
    if (key === "chatNotifications") setChatNotifications(value);
    if (key === "taskNotifications") setTaskNotifications(value);
  };

  return (
    <View className="flex-1 bg-background px-4 pt-6">
      <View className="bg-card border border-border rounded-xl overflow-hidden">
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
          <View className="flex-1">
            <Text className="text-foreground font-medium">
              Push Notifications
            </Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              Receive alerts on your device
            </Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={togglePush}
            trackColor={{ false: "#334155", true: "#3b82f6" }}
            thumbColor="#ffffff"
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
          <View className="flex-1">
            <Text className="text-foreground font-medium">
              Chat Messages
            </Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              New messages from AI agents
            </Text>
          </View>
          <Switch
            value={chatNotifications}
            onValueChange={(v) => togglePreference("chatNotifications", v)}
            trackColor={{ false: "#334155", true: "#3b82f6" }}
            thumbColor="#ffffff"
            disabled={!pushEnabled}
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-4">
          <View className="flex-1">
            <Text className="text-foreground font-medium">
              Task Updates
            </Text>
            <Text className="text-muted-foreground text-xs mt-0.5">
              Task completion and status changes
            </Text>
          </View>
          <Switch
            value={taskNotifications}
            onValueChange={(v) => togglePreference("taskNotifications", v)}
            trackColor={{ false: "#334155", true: "#3b82f6" }}
            thumbColor="#ffffff"
            disabled={!pushEnabled}
          />
        </View>
      </View>
    </View>
  );
}
