import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Message } from "@/types";

interface ChatBubbleProps {
  message: Message;
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.content);
  };

  return (
    <View className={`mb-3 px-4 ${isUser ? "items-end" : "items-start"}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary rounded-br-sm"
            : "bg-card border border-border rounded-bl-sm"
        }`}
      >
        <MarkdownRenderer content={message.content} isUser={isUser} />

        {/* File attachments */}
        {message.files && message.files.length > 0 && (
          <View className="mt-2 gap-1">
            {message.files.map((file, i) => (
              <View
                key={i}
                className="flex-row items-center gap-2 bg-black/10 rounded-lg px-2 py-1"
              >
                <Ionicons name="document" size={12} color={isUser ? "#bfdbfe" : "#94a3b8"} />
                <Text
                  className={`text-xs ${isUser ? "text-blue-200" : "text-muted-foreground"}`}
                  numberOfLines={1}
                >
                  {file.split("/").pop()}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="flex-row items-center justify-between mt-1.5">
          <Text
            className={`text-[10px] ${
              isUser ? "text-blue-200" : "text-muted-foreground"
            }`}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>

          {/* Copy button for assistant messages */}
          {!isUser && (
            <TouchableOpacity onPress={handleCopy} className="ml-2">
              <Ionicons name="copy-outline" size={12} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
