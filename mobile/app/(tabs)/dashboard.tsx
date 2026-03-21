import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";
import type { Rental } from "@/types";

const agentIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  "customer-support": "headset",
  "sales-sdr": "trending-up",
  "social-media": "share-social",
  bookkeeping: "calculator",
  scheduling: "calendar",
  "hr-recruiting": "people",
  "data-analyst": "bar-chart",
  "ecommerce-ops": "cart",
  "real-estate": "business",
};

const agentColors: Record<string, string> = {
  "customer-support": "#3b82f6",
  "sales-sdr": "#10b981",
  "social-media": "#ec4899",
  bookkeeping: "#f59e0b",
  scheduling: "#8b5cf6",
  "hr-recruiting": "#06b6d4",
  "data-analyst": "#6366f1",
  "ecommerce-ops": "#f97316",
  "real-estate": "#14b8a6",
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation("pages");
  const { t: tAgents } = useTranslation("agents");

  const { data: rentals = [], isLoading } = useQuery<Rental[]>({
    queryKey: ["/api/rentals"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-4">
          <Text className="text-2xl font-bold text-foreground">
            {t("login.welcomeBack")}
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            {user?.fullName || user?.username}
          </Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-card border border-border rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="people" size={18} color="#3b82f6" />
              <Text className="text-muted-foreground text-xs">
                Active Agents
              </Text>
            </View>
            <Text className="text-2xl font-bold text-foreground">
              {rentals.filter((r) => r.status === "active").length}
            </Text>
          </View>

          <View className="flex-1 bg-card border border-border rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="chatbubbles" size={18} color="#10b981" />
              <Text className="text-muted-foreground text-xs">
                Messages Used
              </Text>
            </View>
            <Text className="text-2xl font-bold text-foreground">
              {rentals.reduce((sum, r) => sum + r.messagesUsed, 0)}
            </Text>
          </View>
        </View>

        {/* Rented Agents */}
        <Text className="text-lg font-bold text-foreground mb-3">
          Your AI Agents
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#3b82f6" className="py-8" />
        ) : rentals.length === 0 ? (
          <View className="bg-card border border-border rounded-xl p-6 items-center">
            <Ionicons name="people-outline" size={48} color="#64748b" />
            <Text className="text-foreground font-medium mt-3 text-center">
              No agents rented yet
            </Text>
            <Text className="text-muted-foreground text-sm mt-1 text-center">
              Browse the catalog to hire your first AI worker
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/agents")}
              className="bg-primary rounded-lg px-6 py-2.5 mt-4"
            >
              <Text className="text-white font-medium">Browse Agents</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-3 mb-6">
            {rentals.map((rental) => {
              const color = agentColors[rental.agentType] || "#3b82f6";
              const icon = agentIcons[rental.agentType] || "chatbubble";
              const usagePercent = rental.messagesLimit
                ? Math.round(
                    (rental.messagesUsed / rental.messagesLimit) * 100,
                  )
                : 0;

              return (
                <TouchableOpacity
                  key={rental.id}
                  onPress={() => router.push("/(tabs)/chat")}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Ionicons name={icon} size={20} color={color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground font-medium">
                        {rental.agentName}
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        {rental.plan} plan
                      </Text>
                    </View>
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{
                        backgroundColor:
                          rental.status === "active"
                            ? "#22c55e20"
                            : "#f59e0b20",
                      }}
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{
                          color:
                            rental.status === "active"
                              ? "#22c55e"
                              : "#f59e0b",
                        }}
                      >
                        {rental.status}
                      </Text>
                    </View>
                  </View>

                  {/* Usage bar */}
                  <View className="mt-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-muted-foreground text-xs">
                        {rental.messagesUsed} / {rental.messagesLimit} messages
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        {usagePercent}%
                      </Text>
                    </View>
                    <View className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(usagePercent, 100)}%`,
                          backgroundColor:
                            usagePercent > 80 ? "#ef4444" : color,
                        }}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
