import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/queryClient";

interface QueuedMessage {
  id: string;
  agentType: string;
  content: string;
  timestamp: number;
}

const QUEUE_KEY = "offline_message_queue";

export async function queueMessage(
  agentType: string,
  content: string,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    agentType,
    content,
    timestamp: Date.now(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedMessage[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function processQueue(): Promise<void> {
  const queue = await getQueue();
  if (queue.length === 0) return;

  const remaining: QueuedMessage[] = [];

  for (const msg of queue) {
    try {
      await apiRequest("POST", "/api/chat", {
        message: msg.content,
        agentType: msg.agentType,
        conversationHistory: [{ role: "user", content: msg.content }],
      });
    } catch {
      remaining.push(msg);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
