import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const { t } = useTranslation("pages");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    company: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    if (!form.fullName || !form.username || !form.email || !form.password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }
    if (!kvkkConsent) {
      Alert.alert(
        t("register.registerFailed"),
        t("register.kvkkRequired"),
      );
      return;
    }
    setLoading(true);
    try {
      await register({
        ...form,
        kvkkConsent: true,
        dataProcessingConsent: true,
      });
      router.replace("/(tabs)/chat");
    } catch (err: any) {
      Alert.alert(t("register.registerFailed"), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        className="px-6"
      >
        <View className="items-center mb-8 mt-12">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-4">
            <Ionicons name="chatbubble-ellipses" size={32} color="white" />
          </View>
          <Text className="text-2xl font-bold text-foreground">
            {t("register.title")}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1">
            {t("register.subtitle")}
          </Text>
        </View>

        <View className="space-y-3">
          <View>
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("register.fullName")}
            </Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder={t("register.fullNamePlaceholder")}
              placeholderTextColor="#64748b"
              value={form.fullName}
              onChangeText={(v) => update("fullName", v)}
              autoComplete="name"
            />
          </View>

          <View className="mt-3">
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("register.username")}
            </Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder={t("register.usernamePlaceholder")}
              placeholderTextColor="#64748b"
              value={form.username}
              onChangeText={(v) => update("username", v)}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>

          <View className="mt-3">
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("register.email")}
            </Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder={t("register.emailPlaceholder")}
              placeholderTextColor="#64748b"
              value={form.email}
              onChangeText={(v) => update("email", v)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View className="mt-3">
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("register.password")}
            </Text>
            <View className="relative">
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-foreground pr-12"
                placeholder={t("register.passwordPlaceholder")}
                placeholderTextColor="#64748b"
                value={form.password}
                onChangeText={(v) => update("password", v)}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3"
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mt-3">
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("register.company")}
            </Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder={t("register.companyPlaceholder")}
              placeholderTextColor="#64748b"
              value={form.company}
              onChangeText={(v) => update("company", v)}
            />
          </View>

          <View className="flex-row items-center mt-4 gap-3">
            <Switch
              value={kvkkConsent}
              onValueChange={setKvkkConsent}
              trackColor={{ false: "#334155", true: "#3b82f6" }}
              thumbColor={kvkkConsent ? "#ffffff" : "#94a3b8"}
            />
            <Text className="text-xs text-muted-foreground flex-1">
              {t("register.kvkkConsent")} {t("register.kvkkLink")}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !kvkkConsent}
            className={`rounded-lg py-3.5 items-center mt-4 ${
              loading || !kvkkConsent ? "bg-muted" : "bg-primary"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {t("register.submit")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-center mt-6 mb-12">
          <Text className="text-muted-foreground text-sm">
            {t("register.hasAccount")}{" "}
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-primary text-sm font-medium">
                {t("register.signIn")}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
