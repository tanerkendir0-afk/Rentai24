import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

export default function LanguageScreen() {
  const { t, i18n } = useTranslation("common");
  const queryClient = useQueryClient();

  const languages = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  ];

  const handleSelect = async (code: string) => {
    try {
      await i18n.changeLanguage(code);
      await apiRequest("PATCH", "/api/auth/language", { language: code });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      Alert.alert(t("language.saved"), t("language.savedDesc"));
    } catch {
      // Language changed locally even if API fails
    }
  };

  return (
    <View className="flex-1 bg-background px-4 pt-6">
      <Text className="text-muted-foreground text-sm mb-4">
        {t("language.preferenceDesc")}
      </Text>

      <View className="bg-card border border-border rounded-xl overflow-hidden">
        {languages.map((lang, index) => (
          <TouchableOpacity
            key={lang.code}
            onPress={() => handleSelect(lang.code)}
            className={`flex-row items-center px-4 py-4 ${
              index < languages.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <Text className="text-2xl mr-3">{lang.flag}</Text>
            <Text className="text-foreground font-medium flex-1">
              {lang.label}
            </Text>
            {i18n.language === lang.code && (
              <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
