import { Redirect, useLocalSearchParams } from "expo-router";

export default function AgentChatDeepLink() {
  const { agentId } = useLocalSearchParams<{ agentId: string }>();
  // Deep link entry: redirect to the main chat tab
  // The agent selection will be handled by the chat screen
  return <Redirect href="/(tabs)/chat" />;
}
