import React from "react";
import { View, Text, ActivityIndicator } from "react-native";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#3b82f6" />
      {message && (
        <Text className="text-muted-foreground text-sm mt-4">{message}</Text>
      )}
    </View>
  );
}
