import React from "react";
import { ScrollView, TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { agentMetadata } from "@/data/agents";

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

interface AgentSelectorProps {
  selectedAgent: string;
  onSelect: (agentId: string) => void;
  rentedAgents?: string[];
}

export default function AgentSelector({
  selectedAgent,
  onSelect,
  rentedAgents = [],
}: AgentSelectorProps) {
  const { t } = useTranslation("agents");

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="py-3 px-2"
      contentContainerStyle={{ gap: 8 }}
    >
      {agentMetadata.map((agent) => {
        const isSelected = selectedAgent === agent.id;
        const isRented = rentedAgents.length === 0 || rentedAgents.includes(agent.id);
        const color = agentColors[agent.id] || "#3b82f6";
        const iconName = agentIcons[agent.id] || "chatbubble";

        return (
          <TouchableOpacity
            key={agent.id}
            onPress={() => onSelect(agent.id)}
            className={`flex-row items-center px-3 py-2 rounded-full ${
              isSelected ? "border-2" : "border border-border"
            }`}
            style={{
              backgroundColor: isSelected ? `${color}20` : "#1e293b",
              borderColor: isSelected ? color : "#334155",
            }}
          >
            <View
              className="w-7 h-7 rounded-full items-center justify-center mr-2"
              style={{ backgroundColor: `${color}30` }}
            >
              <Ionicons name={iconName} size={14} color={color} />
            </View>
            <Text
              className="text-xs font-medium"
              style={{ color: isSelected ? color : "#94a3b8" }}
              numberOfLines={1}
            >
              {t(`${agent.id}.name`)}
            </Text>
            {!isRented && (
              <Ionicons
                name="lock-closed"
                size={10}
                color="#64748b"
                style={{ marginLeft: 4 }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
