import React, { useEffect, useRef } from "react";
import { View, Text, Animated, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
}

const toastConfig = {
  success: { icon: "checkmark-circle" as const, color: "#22c55e", bg: "#22c55e15" },
  error: { icon: "alert-circle" as const, color: "#ef4444", bg: "#ef444415" },
  info: { icon: "information-circle" as const, color: "#3b82f6", bg: "#3b82f615" },
};

export default function Toast({
  visible,
  message,
  type = "info",
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const config = toastConfig[type];

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();

      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={{ transform: [{ translateY }] }}
      className="absolute top-14 left-4 right-4 z-50"
    >
      <TouchableOpacity
        onPress={dismiss}
        activeOpacity={0.9}
        className="rounded-xl border border-border px-4 py-3 flex-row items-center"
        style={{ backgroundColor: config.bg }}
      >
        <Ionicons name={config.icon} size={20} color={config.color} />
        <Text className="text-foreground text-sm font-medium ml-3 flex-1">
          {message}
        </Text>
        <Ionicons name="close" size={16} color="#64748b" />
      </TouchableOpacity>
    </Animated.View>
  );
}
