import React, { useRef, useEffect } from "react";
import { FlatList, View, Text, ActivityIndicator } from "react-native";
import ChatBubble from "./ChatBubble";
import TypingIndicator from "./TypingIndicator";
import type { Message } from "@/types";

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  agentType: string;
}

export default function MessageList({
  messages,
  isStreaming,
  agentType,
}: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-muted-foreground text-center text-base">
          Start a conversation with your AI agent. Type a message below to begin.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <ChatBubble message={item} />}
      contentContainerStyle={{ paddingVertical: 16 }}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={isStreaming ? <TypingIndicator /> : null}
    />
  );
}
