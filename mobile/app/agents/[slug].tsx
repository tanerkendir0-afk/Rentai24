import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
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

export default function AgentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t } = useTranslation("agents");

  const agent = agentMetadata.find((a) => a.slug === slug);
  if (!agent) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Text className="text-foreground">Agent not found</Text>
      </View>
    );
  }

  const color = agentColors[agent.id] || "#3b82f6";
  const skills: string[] = t(`${agent.id}.skills`, { returnObjects: true }) as any;
  const useCases: string[] = t(`${agent.id}.useCases`, { returnObjects: true }) as any;

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Hero */}
      <View
        className="px-6 py-8 items-center"
        style={{ backgroundColor: `${color}10` }}
      >
        <View
          className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name="chatbubble-ellipses" size={36} color={color} />
        </View>
        <Text className="text-2xl font-bold text-foreground text-center">
          {t(`${agent.id}.name`)}
        </Text>
        <Text className="text-muted-foreground text-sm mt-1">
          {t(`${agent.id}.role`)}
        </Text>
        <Text className="text-primary font-semibold mt-2">
          {t(`${agent.id}.priceLabel`)}
        </Text>
      </View>

      <View className="px-4 py-6">
        {/* Description */}
        <Text className="text-foreground text-sm leading-6 mb-6">
          {t(`${agent.id}.fullDescription`)}
        </Text>

        {/* Skills */}
        <Text className="text-foreground font-bold text-base mb-3">
          Skills
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {Array.isArray(skills) &&
            skills.map((skill, i) => (
              <View
                key={i}
                className="px-3 py-1.5 rounded-full"
                style={{ backgroundColor: `${color}15` }}
              >
                <Text className="text-xs font-medium" style={{ color }}>
                  {skill}
                </Text>
              </View>
            ))}
        </View>

        {/* Integrations */}
        <Text className="text-foreground font-bold text-base mb-3">
          Integrations
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {agent.integrations.map((int, i) => (
            <View
              key={i}
              className="px-3 py-1.5 rounded-full bg-card border border-border"
            >
              <Text className="text-muted-foreground text-xs">{int}</Text>
            </View>
          ))}
        </View>

        {/* Use Cases */}
        <Text className="text-foreground font-bold text-base mb-3">
          Use Cases
        </Text>
        <View className="gap-2 mb-6">
          {Array.isArray(useCases) &&
            useCases.map((useCase, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={color}
                  style={{ marginTop: 2 }}
                />
                <Text className="text-muted-foreground text-sm flex-1">
                  {useCase}
                </Text>
              </View>
            ))}
        </View>

        {/* Languages */}
        <Text className="text-foreground font-bold text-base mb-3">
          Languages
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {agent.languages.map((lang, i) => (
            <View
              key={i}
              className="px-3 py-1.5 rounded-full bg-card border border-border"
            >
              <Text className="text-muted-foreground text-xs">{lang}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/chat")}
          className="bg-primary rounded-xl py-4 items-center"
        >
          <Text className="text-white font-bold text-base">
            Start Chatting
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
