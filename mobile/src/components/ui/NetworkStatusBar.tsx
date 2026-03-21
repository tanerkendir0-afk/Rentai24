import React from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function NetworkStatusBar() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View className="bg-destructive/90 px-4 py-2 flex-row items-center justify-center">
      <Ionicons name="cloud-offline" size={14} color="white" />
      <Text className="text-white text-xs font-medium ml-2">
        No internet connection. Some features may be limited.
      </Text>
    </View>
  );
}
