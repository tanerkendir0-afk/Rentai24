import React from "react";
import { View, Text } from "react-native";
import type { Message } from "@/types";

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View
      className={`mb-3 px-4 ${isUser ? "items-end" : "items-start"}`}
    >
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        }`}
      >
        <Text
          className={`text-sm leading-5 ${
            isUser ? "text-white" : "text-foreground"
          }`}
        >
          {message.content}
        </Text>
        <Text
          className={`text-[10px] mt-1.5 ${
            isUser ? "text-blue-200" : "text-muted-foreground"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}
