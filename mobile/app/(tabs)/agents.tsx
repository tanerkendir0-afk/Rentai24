import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { agentMetadata, categories } from "@/data/agents";

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

export default function AgentsScreen() {
  const router = useRouter();
  const { t } = useTranslation("agents");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredAgents =
    selectedCategory === "All"
      ? agentMetadata
      : agentMetadata.filter((a) => a.category === selectedCategory);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-4 py-4">
        <Text className="text-2xl font-bold text-foreground">AI Workers</Text>
        <Text className="text-muted-foreground text-sm mt-1">
          Hire pre-trained AI agents for your team
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full ${
              selectedCategory === cat
                ? "bg-primary"
                : "bg-card border border-border"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selectedCategory === cat
                  ? "text-white"
                  : "text-muted-foreground"
              }`}
            >
              {t(`categories.${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Agent list */}
      <FlatList
        data={filteredAgents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => {
          const color = agentColors[item.id] || "#3b82f6";
          const icon = agentIcons[item.id] || "chatbubble";

          return (
            <TouchableOpacity
              onPress={() => router.push(`/agents/${item.slug}`)}
              className="bg-card border border-border rounded-xl p-4"
            >
              <View className="flex-row items-start gap-3">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Ionicons name={icon} size={24} color={color} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-foreground font-semibold text-base">
                      {t(`${item.id}.name`)}
                    </Text>
                    {t(`${item.id}.tag`, { defaultValue: "" }) && (
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Text
                          className="text-[10px] font-bold"
                          style={{ color }}
                        >
                          {t(`${item.id}.tag`)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    className="text-muted-foreground text-xs mt-1"
                    numberOfLines={2}
                  >
                    {t(`${item.id}.shortDescription`)}
                  </Text>
                  <View className="flex-row items-center gap-4 mt-2">
                    <Text className="text-primary text-xs font-medium">
                      {t(`${item.id}.priceLabel`)}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="globe" size={12} color="#64748b" />
                      <Text className="text-muted-foreground text-[10px]">
                        {item.languages.length} languages
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}
