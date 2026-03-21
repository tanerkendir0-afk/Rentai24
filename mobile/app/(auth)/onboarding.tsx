import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { agentMetadata } from "@/data/agents";

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

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation("pages");
  const { t: tAgents } = useTranslation("agents");

  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const industries = [
    { key: "technology", icon: "code-slash" as const },
    { key: "finance", icon: "calculator" as const },
    { key: "healthcare", icon: "heart" as const },
    { key: "ecommerce", icon: "cart" as const },
    { key: "realEstate", icon: "business" as const },
    { key: "marketing", icon: "megaphone" as const },
    { key: "education", icon: "school" as const },
    { key: "consulting", icon: "briefcase" as const },
  ];

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        industry: selectedIndustry,
        intendedAgents: selectedAgents,
        onboardingCompleted: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      router.replace("/(tabs)/chat");
    } catch (err: any) {
      Alert.alert(t("onboarding.errorTitle"), t("onboarding.errorDescription"));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        onboardingCompleted: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch {
      // Skip silently
    }
    router.replace("/(tabs)/chat");
  };

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-16">
      {/* Header */}
      <View className="items-center mb-8">
        <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-4">
          <Ionicons name="sparkles" size={32} color="#3b82f6" />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center">
          {t("onboarding.title")}
        </Text>
        <Text className="text-muted-foreground text-sm mt-2 text-center">
          {t("onboarding.description")}
        </Text>
      </View>

      {/* Industry selection */}
      <Text className="text-foreground font-semibold text-base mb-3">
        {t("onboarding.industry")}
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        {industries.map((ind) => (
          <TouchableOpacity
            key={ind.key}
            onPress={() => setSelectedIndustry(ind.key)}
            className={`flex-row items-center px-3 py-2.5 rounded-lg border ${
              selectedIndustry === ind.key
                ? "bg-primary/10 border-primary"
                : "bg-card border-border"
            }`}
          >
            <Ionicons
              name={ind.icon}
              size={16}
              color={selectedIndustry === ind.key ? "#3b82f6" : "#94a3b8"}
            />
            <Text
              className={`text-xs font-medium ml-2 ${
                selectedIndustry === ind.key
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {t(`onboarding.industries.${ind.key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Agent interest */}
      <Text className="text-foreground font-semibold text-base mb-1">
        {t("onboarding.intendedAgents")}
      </Text>
      <Text className="text-muted-foreground text-xs mb-3">
        {t("onboarding.intendedAgentsHint")}
      </Text>
      <View className="gap-2 mb-8">
        {agentMetadata.map((agent) => {
          const color = agentColors[agent.id] || "#3b82f6";
          const isSelected = selectedAgents.includes(agent.id);

          return (
            <TouchableOpacity
              key={agent.id}
              onPress={() => toggleAgent(agent.id)}
              className={`flex-row items-center px-4 py-3 rounded-xl border ${
                isSelected ? "border-2" : "border-border"
              }`}
              style={{
                backgroundColor: isSelected ? `${color}10` : "#1e293b",
                borderColor: isSelected ? color : "#334155",
              }}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: `${color}20` }}
              >
                {isSelected ? (
                  <Ionicons name="checkmark" size={16} color={color} />
                ) : (
                  <Ionicons name="add" size={16} color={color} />
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-medium"
                  style={{ color: isSelected ? color : "#f8fafc" }}
                >
                  {tAgents(`${agent.id}.name`)}
                </Text>
                <Text className="text-muted-foreground text-[10px]">
                  {agent.category}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Buttons */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading}
        className="bg-primary rounded-xl py-4 items-center mb-3"
      >
        <Text className="text-white font-bold text-base">
          {t("onboarding.submit")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSkip} className="py-3 items-center mb-12">
        <Text className="text-muted-foreground text-sm">
          {t("onboarding.skip")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
