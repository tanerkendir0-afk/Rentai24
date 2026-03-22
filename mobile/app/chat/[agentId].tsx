import { useEffect } from "react";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/lib/auth";

/**
 * Deep link entry point for agent-specific chats.
 * URL: rentai24://chat/{agentId}
 * Redirects to the chat tab with the agent pre-selected.
 */
export default function AgentChatDeepLink() {
  const { agentId } = useLocalSearchParams<{ agentId: string }>();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && agentId) {
      // Navigate to chat tab - agentId will be available via global state or params
      router.replace({
        pathname: "/(tabs)/chat",
        params: { agent: agentId },
      });
    }
  }, [isLoading, user, agentId]);

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

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}
