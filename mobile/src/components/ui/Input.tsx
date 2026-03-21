import React from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <View>
      {label && (
        <Text className="text-sm font-medium text-foreground mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        className={`bg-card border rounded-lg px-4 py-3 text-foreground ${
          error ? "border-destructive" : "border-border"
        }`}
        placeholderTextColor="#64748b"
        {...props}
      />
      {error && (
        <Text className="text-destructive text-xs mt-1">{error}</Text>
      )}
    </View>
  );
}
