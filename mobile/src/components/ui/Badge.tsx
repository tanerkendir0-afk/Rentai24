import React from "react";
import { View, Text } from "react-native";

interface BadgeProps {
  label: string;
  color?: string;
}

export default function Badge({ label, color = "#3b82f6" }: BadgeProps) {
  return (
    <View
      className="px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${color}20` }}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
