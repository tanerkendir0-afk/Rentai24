import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";

interface SettingsItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  color?: string;
  onPress?: () => void;
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation("common");

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: "Account",
      items: [
        {
          icon: "person",
          label: "Profile",
          route: "/settings/profile",
        },
        {
          icon: "lock-closed",
          label: "Security",
          route: "/settings/security",
        },
        {
          icon: "language",
          label: t("language.label"),
          route: "/settings/language",
        },
      ],
    },
    {
      title: "App",
      items: [
        {
          icon: "card",
          label: "Subscription",
          route: "/settings/subscription",
        },
        {
          icon: "notifications",
          label: "Notifications",
          route: "/settings/notifications",
        },
      ],
    },
    {
      title: "",
      items: [
        {
          icon: "log-out",
          label: t("nav.signOut"),
          color: "#ef4444",
          onPress: handleLogout,
        },
      ],
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView className="flex-1">
        {/* User info header */}
        <View className="px-4 py-6 items-center border-b border-border">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-3">
            <Text className="text-white text-2xl font-bold">
              {(user?.fullName || user?.username || "U")[0].toUpperCase()}
            </Text>
          </View>
          <Text className="text-foreground font-bold text-lg">
            {user?.fullName || user?.username}
          </Text>
          <Text className="text-muted-foreground text-sm">{user?.email}</Text>
        </View>

        {/* Settings sections */}
        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} className="mt-6">
            {section.title ? (
              <Text className="text-muted-foreground text-xs font-semibold uppercase px-4 mb-2">
                {section.title}
              </Text>
            ) : null}
            <View className="bg-card mx-4 rounded-xl border border-border overflow-hidden">
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  onPress={
                    item.onPress ||
                    (item.route
                      ? () => router.push(item.route as any)
                      : undefined)
                  }
                  className={`flex-row items-center px-4 py-3.5 ${
                    itemIndex < section.items.length - 1
                      ? "border-b border-border"
                      : ""
                  }`}
                >
                  <View
                    className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                    style={{
                      backgroundColor: item.color
                        ? `${item.color}20`
                        : "#3b82f620",
                    }}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={item.color || "#3b82f6"}
                    />
                  </View>
                  <Text
                    className="flex-1 text-sm font-medium"
                    style={{ color: item.color || "#f8fafc" }}
                  >
                    {item.label}
                  </Text>
                  {!item.onPress && (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#64748b"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <Text className="text-center text-muted-foreground text-xs mt-8 mb-6">
          RentAI 24 v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
