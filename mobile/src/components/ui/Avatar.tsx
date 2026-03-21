import React from "react";
import { View, Text } from "react-native";

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export default function Avatar({
  name,
  size = 40,
  color = "#3b82f6",
}: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}20`,
      }}
      className="items-center justify-center"
    >
      <Text
        style={{ color, fontSize: size * 0.4 }}
        className="font-bold"
      >
        {initials}
      </Text>
    </View>
  );
}
