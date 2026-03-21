import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ChatRatingProps {
  onRate: (rating: number) => void;
}

export default function ChatRating({ onRate }: ChatRatingProps) {
  const [rating, setRating] = useState(0);

  const handleRate = (value: number) => {
    setRating(value);
    onRate(value);
  };

  return (
    <View className="items-center py-4 px-6">
      <Text className="text-muted-foreground text-sm mb-3">
        Rate this conversation
      </Text>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => handleRate(star)}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={28}
              color={star <= rating ? "#f59e0b" : "#64748b"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
