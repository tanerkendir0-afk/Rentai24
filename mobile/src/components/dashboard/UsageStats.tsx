import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface UsageStatsProps {
  activeAgents: number;
  totalMessages: number;
}

export default function UsageStats({
  activeAgents,
  totalMessages,
}: UsageStatsProps) {
  return (
    <View className="flex-row gap-3 mb-6">
      <View className="flex-1 bg-card border border-border rounded-xl p-4">
        <View className="flex-row items-center gap-2 mb-2">
          <Ionicons name="people" size={18} color="#3b82f6" />
          <Text className="text-muted-foreground text-xs">Active Agents</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground">
          {activeAgents}
        </Text>
      </View>

      <View className="flex-1 bg-card border border-border rounded-xl p-4">
        <View className="flex-row items-center gap-2 mb-2">
          <Ionicons name="chatbubbles" size={18} color="#10b981" />
          <Text className="text-muted-foreground text-xs">Messages Used</Text>
        </View>
        <Text className="text-2xl font-bold text-foreground">
          {totalMessages}
        </Text>
      </View>
    </View>
  );
}
