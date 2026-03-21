import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  authenticateWithBiometrics,
} from "@/services/biometrics";

interface BiometricGateProps {
  children: React.ReactNode;
}

export default function BiometricGate({ children }: BiometricGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const available = await isBiometricAvailable();
    const enabled = await isBiometricEnabled();

    if (!available || !enabled) {
      // Biometric not configured - skip gate
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    // Attempt biometric auth
    const success = await authenticateWithBiometrics();
    setIsAuthenticated(success);
    setFailed(!success);
    setIsChecking(false);
  };

  const retry = async () => {
    setFailed(false);
    setIsChecking(true);
    const success = await authenticateWithBiometrics();
    setIsAuthenticated(success);
    setFailed(!success);
    setIsChecking(false);
  };

  if (isChecking) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Ionicons name="finger-print" size={64} color="#3b82f6" />
        <Text className="text-foreground font-medium mt-4">
          Authenticating...
        </Text>
      </View>
    );
  }

  if (!isAuthenticated && failed) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <View className="w-20 h-20 rounded-full bg-destructive/20 items-center justify-center mb-6">
          <Ionicons name="lock-closed" size={36} color="#ef4444" />
        </View>
        <Text className="text-foreground font-bold text-xl text-center mb-2">
          Authentication Required
        </Text>
        <Text className="text-muted-foreground text-sm text-center mb-8">
          Use Face ID or Touch ID to access RentAI 24
        </Text>
        <TouchableOpacity
          onPress={retry}
          className="bg-primary rounded-xl px-8 py-4 flex-row items-center gap-2"
        >
          <Ionicons name="finger-print" size={20} color="white" />
          <Text className="text-white font-bold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}
