import React from "react";
import { View } from "react-native";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <View
      className={`bg-card border border-border rounded-xl p-4 ${className}`}
    >
      {children}
    </View>
  );
}
