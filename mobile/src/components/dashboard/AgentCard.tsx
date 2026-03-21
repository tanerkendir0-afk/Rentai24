import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Rental } from "@/types";

interface AgentCardProps {
  rental: Rental;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function AgentCard({
  rental,
  color,
  icon,
  onPress,
}: AgentCardProps) {
  const usagePercent = rental.messagesLimit
    ? Math.round((rental.messagesUsed / rental.messagesLimit) * 100)
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card border border-border rounded-xl p-4"
    >
      <View className="flex-row items-center gap-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground font-medium">{rental.agentName}</Text>
          <Text className="text-muted-foreground text-xs">
            {rental.plan} plan
          </Text>
        </View>
        <View
          className="px-2 py-1 rounded-full"
          style={{
            backgroundColor:
              rental.status === "active" ? "#22c55e20" : "#f59e0b20",
          }}
        >
          <Text
            className="text-xs font-medium"
            style={{
              color: rental.status === "active" ? "#22c55e" : "#f59e0b",
            }}
          >
            {rental.status}
          </Text>
        </View>
      </View>

      <View className="mt-3">
        <View className="flex-row justify-between mb-1">
          <Text className="text-muted-foreground text-xs">
            {rental.messagesUsed} / {rental.messagesLimit}
          </Text>
          <Text className="text-muted-foreground text-xs">{usagePercent}%</Text>
        </View>
        <View className="h-1.5 bg-muted rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{
              width: `${Math.min(usagePercent, 100)}%`,
              backgroundColor: usagePercent > 80 ? "#ef4444" : color,
            }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
