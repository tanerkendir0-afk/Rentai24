import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variants = {
  primary: { bg: "bg-primary", text: "text-white" },
  secondary: { bg: "bg-secondary", text: "text-white" },
  outline: { bg: "bg-transparent border border-border", text: "text-foreground" },
  destructive: { bg: "bg-destructive", text: "text-white" },
};

export default function Button({
  onPress,
  title,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  const v = variants[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-lg py-3.5 items-center ${v.bg} ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text className={`font-semibold text-base ${v.text}`}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
