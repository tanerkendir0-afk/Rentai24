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
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const { t } = useTranslation("pages");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/(tabs)/chat");
    } catch (err: any) {
      Alert.alert(t("login.loginFailed"), err.message);
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
        <View className="items-center mb-8">
          <View className="w-16 h-16 rounded-full bg-primary items-center justify-center mb-4">
            <Ionicons name="chatbubble-ellipses" size={32} color="white" />
          </View>
          <Text className="text-2xl font-bold text-foreground">
            {t("login.title")}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1">
            {t("login.subtitle")}
          </Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("login.email")}
            </Text>
            <TextInput
              className="bg-card border border-border rounded-lg px-4 py-3 text-foreground"
              placeholder={t("login.emailPlaceholder")}
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View className="mt-4">
            <Text className="text-sm font-medium text-foreground mb-1.5">
              {t("login.password")}
            </Text>
            <View className="relative">
              <TextInput
                className="bg-card border border-border rounded-lg px-4 py-3 text-foreground pr-12"
                placeholder={t("login.passwordPlaceholder")}
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
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

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="bg-primary rounded-lg py-3.5 items-center mt-6"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {t("login.submit")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-center mt-8">
          <Text className="text-muted-foreground text-sm">
            {t("login.noAccount")}{" "}
          </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-primary text-sm font-medium">
                {t("login.createOne")}
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
