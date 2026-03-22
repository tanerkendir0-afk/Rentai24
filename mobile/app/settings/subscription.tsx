import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import ENV from "@/lib/env";

export default function SubscriptionScreen() {
  const { user } = useAuth();

  const { data: boostStatus, isLoading } = useQuery({
    queryKey: ["/api/boost/status"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  return (
    <View className="flex-1 bg-background px-4 pt-6">
      {/* Current Plan */}
      <View className="bg-card border border-border rounded-xl p-5 mb-6">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center">
            <Ionicons name="diamond" size={20} color="#3b82f6" />
          </View>
          <View>
            <Text className="text-foreground font-bold text-base">
              {user?.hasSubscription ? "Active Plan" : "Free Plan"}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {user?.hasSubscription
                ? "You have an active subscription"
                : "Upgrade to unlock all features"}
            </Text>
          </View>
        </View>
      </View>

      {/* Manage Subscription */}
      <TouchableOpacity
        onPress={() =>
          Linking.openURL(`${ENV.API_BASE_URL}/settings#subscription`)
        }
        className="bg-primary rounded-xl py-4 items-center"
      >
        <Text className="text-white font-bold">
          {user?.hasSubscription
            ? "Manage Subscription"
            : "Upgrade Plan"}
        </Text>
      </TouchableOpacity>

      <Text className="text-muted-foreground text-xs text-center mt-4">
        Subscription management is handled through the web portal for security.
      </Text>
    </View>
  );
}
