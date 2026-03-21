import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FilePreviewProps {
  files: { uri: string; name: string; type: string }[];
  onRemove: (index: number) => void;
}

export default function FilePreview({ files, onRemove }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-t border-border px-3 py-2"
      contentContainerStyle={{ gap: 8 }}
    >
      {files.map((file, index) => (
        <View
          key={index}
          className="bg-card border border-border rounded-lg p-2 flex-row items-center"
        >
          {file.type.startsWith("image/") ? (
            <Image
              source={{ uri: file.uri }}
              className="w-10 h-10 rounded"
            />
          ) : (
            <View className="w-10 h-10 bg-muted rounded items-center justify-center">
              <Ionicons name="document" size={20} color="#94a3b8" />
            </View>
          )}
          <Text
            className="text-xs text-foreground ml-2 max-w-[80px]"
            numberOfLines={1}
          >
            {file.name}
          </Text>
          <TouchableOpacity
            onPress={() => onRemove(index)}
            className="ml-2"
          >
            <Ionicons name="close-circle" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
