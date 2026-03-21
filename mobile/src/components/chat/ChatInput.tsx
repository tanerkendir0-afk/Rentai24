import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useHaptics } from "@/hooks/useHaptics";

interface ChatInputProps {
  onSend: (message: string) => void;
  onAttach: () => void;
  onCamera: () => void;
  isStreaming: boolean;
  onStop: () => void;
}

export default function ChatInput({
  onSend,
  onAttach,
  onCamera,
  isStreaming,
  onStop,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const haptics = useHaptics();

  const handleSend = () => {
    if (!text.trim()) return;
    haptics.light();
    onSend(text.trim());
    setText("");
  };

  return (
    <View className="border-t border-border bg-background px-3 pb-2 pt-2">
      <View className="flex-row items-end gap-2">
        <TouchableOpacity
          onPress={onAttach}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="attach" size={22} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCamera}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="image" size={22} color="#64748b" />
        </TouchableOpacity>

        <View className="flex-1 bg-card border border-border rounded-2xl px-4 py-2 min-h-[40px] max-h-[120px]">
          <TextInput
            className="text-foreground text-sm"
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
            value={text}
            onChangeText={setText}
            multiline
            returnKeyType={Platform.OS === "ios" ? "default" : "send"}
            onSubmitEditing={
              Platform.OS === "android" ? handleSend : undefined
            }
            editable={!isStreaming}
          />
        </View>

        {isStreaming ? (
          <TouchableOpacity
            onPress={onStop}
            className="w-10 h-10 rounded-full bg-destructive items-center justify-center"
          >
            <Ionicons name="stop" size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim()}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              text.trim() ? "bg-primary" : "bg-muted"
            }`}
          >
            <Ionicons
              name="send"
              size={18}
              color={text.trim() ? "white" : "#64748b"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
