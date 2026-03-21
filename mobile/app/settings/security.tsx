import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Switch,
} from "react-native";
import { apiRequest } from "@/lib/queryClient";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

export default function SecurityScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);

    const stored = await SecureStore.getItemAsync("biometricEnabled");
    setBiometricEnabled(stored === "true");
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to enable biometric login",
      });
      if (result.success) {
        await SecureStore.setItemAsync("biometricEnabled", "true");
        setBiometricEnabled(true);
      }
    } else {
      await SecureStore.setItemAsync("biometricEnabled", "false");
      setBiometricEnabled(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("PATCH", "/api/auth/password", {
        currentPassword,
        newPassword,
      });
      Alert.alert("Success", "Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 pt-6">
      {/* Biometric */}
      {biometricAvailable && (
        <View className="bg-card border border-border rounded-xl p-4 mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-foreground font-medium">
                Face ID / Touch ID
              </Text>
              <Text className="text-muted-foreground text-xs mt-1">
                Use biometrics to unlock the app
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: "#334155", true: "#3b82f6" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>
      )}

      {/* Change Password */}
      <Text className="text-foreground font-bold text-base mb-4">
        Change Password
      </Text>
      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-foreground mb-1.5">
            Current Password
          </Text>
          <TextInput
            className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            placeholder="Enter current password"
            placeholderTextColor="#64748b"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-foreground mb-1.5">
            New Password
          </Text>
          <TextInput
            className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Enter new password"
            placeholderTextColor="#64748b"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-foreground mb-1.5">
            Confirm Password
          </Text>
          <TextInput
            className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Confirm new password"
            placeholderTextColor="#64748b"
          />
        </View>

        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={loading}
          className="bg-primary rounded-lg py-3.5 items-center mt-2"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
