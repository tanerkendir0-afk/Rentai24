import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Show onboarding for new users
  if (!user.onboardingCompleted) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(tabs)/chat" />;
}
