import React from "react";
import { View, Text, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Activity {
  id: number;
  type: string;
  agentType: string;
  agentName: string;
  summary: string;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

const typeIcons: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  chat_response: { icon: "chatbubble", color: "#3b82f6" },
  email_reply: { icon: "mail", color: "#10b981" },
  task_completed: { icon: "checkmark-circle", color: "#22c55e" },
  escalation: { icon: "alert-circle", color: "#f59e0b" },
  meeting_scheduled: { icon: "calendar", color: "#8b5cf6" },
  lead_generated: { icon: "person-add", color: "#ec4899" },
};

export default function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <View className="items-center py-8">
        <Ionicons name="pulse-outline" size={32} color="#64748b" />
        <Text className="text-muted-foreground text-sm mt-2">
          No recent activity
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      keyExtractor={(item) => item.id.toString()}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const config = typeIcons[item.type] || {
          icon: "ellipse" as const,
          color: "#64748b",
        };

        return (
          <View className="flex-row items-start gap-3 py-3 border-b border-border">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mt-0.5"
              style={{ backgroundColor: `${config.color}20` }}
            >
              <Ionicons name={config.icon} size={14} color={config.color} />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-sm">
                <Text className="font-semibold">{item.agentName}</Text>{" "}
                {item.summary}
              </Text>
              <Text className="text-muted-foreground text-[10px] mt-1">
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
