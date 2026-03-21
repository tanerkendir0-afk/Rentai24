import React from "react";
import { ScrollView, TouchableOpacity, Text } from "react-native";

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  getLabel: (category: string) => string;
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
  getLabel,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 mb-4"
      contentContainerStyle={{ gap: 8 }}
    >
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat}
          onPress={() => onSelect(cat)}
          className={`px-4 py-2 rounded-full ${
            selected === cat
              ? "bg-primary"
              : "bg-card border border-border"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              selected === cat ? "text-white" : "text-muted-foreground"
            }`}
          >
            {getLabel(cat)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
