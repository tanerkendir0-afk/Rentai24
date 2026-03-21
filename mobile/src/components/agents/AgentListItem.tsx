import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AgentMetadata } from "@/data/agents";

interface AgentListItemProps {
  agent: AgentMetadata;
  name: string;
  description: string;
  price: string;
  tag?: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

export default function AgentListItem({
  agent,
  name,
  description,
  price,
  tag,
  color,
  icon,
  onPress,
}: AgentListItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-card border border-border rounded-xl p-4"
    >
      <View className="flex-row items-start gap-3">
        <View
          className="w-12 h-12 rounded-xl items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-foreground font-semibold text-base">
              {name}
            </Text>
            {tag && (
              <View
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20` }}
              >
                <Text className="text-[10px] font-bold" style={{ color }}>
                  {tag}
                </Text>
              </View>
            )}
          </View>
          <Text
            className="text-muted-foreground text-xs mt-1"
            numberOfLines={2}
          >
            {description}
          </Text>
          <Text className="text-primary text-xs font-medium mt-2">
            {price}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </View>
    </TouchableOpacity>
  );
}
