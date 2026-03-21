import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Conversation } from "@/types";

interface ConversationDrawerProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNew: () => void;
  onDelete: (visibleId: string) => void;
  onClose: () => void;
}

export default function ConversationDrawer({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
}: ConversationDrawerProps) {
  const handleDelete = (visibleId: string) => {
    Alert.alert("Delete Conversation", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(visibleId),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Text className="text-lg font-bold text-foreground">
          Conversations
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity onPress={onNew}>
            <Ionicons name="add-circle" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.visibleId}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              onSelect(item);
              onClose();
            }}
            onLongPress={() => handleDelete(item.visibleId)}
            className={`px-4 py-3 border-b border-border ${
              activeId === item.visibleId ? "bg-card" : ""
            }`}
          >
            <Text
              className="text-foreground font-medium text-sm"
              numberOfLines={1}
            >
              {item.title || "New Conversation"}
            </Text>
            {item.lastMessage && (
              <Text
                className="text-muted-foreground text-xs mt-1"
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            )}
            <Text className="text-muted-foreground text-[10px] mt-1">
              {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Text className="text-muted-foreground text-sm">
              No conversations yet
            </Text>
          </View>
        }
      />
    </View>
  );
}
