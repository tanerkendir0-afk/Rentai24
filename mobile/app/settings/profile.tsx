import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfileScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [company, setCompany] = useState(user?.company || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", { fullName, company });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      Alert.alert("Success", "Profile updated successfully");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-background px-4 pt-6">
      <View className="gap-4">
        <View>
          <Text className="text-sm font-medium text-foreground mb-1.5">
            Full Name
          </Text>
          <TextInput
            className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your name"
            placeholderTextColor="#64748b"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-foreground mb-1.5">
            Email
          </Text>
          <TextInput
            className="bg-card border border-border rounded-lg px-4 py-3 text-muted-foreground"
            value={user?.email || ""}
            editable={false}
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-foreground mb-1.5">
            Company
          </Text>
          <TextInput
            className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
            value={company}
            onChangeText={setCompany}
            placeholder="Enter company name"
            placeholderTextColor="#64748b"
          />
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className="bg-primary rounded-lg py-3.5 items-center mt-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
