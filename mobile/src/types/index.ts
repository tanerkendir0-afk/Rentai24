export interface Rental {
  id: number;
  agentType: string;
  agentName: string;
  plan: string;
  status: string;
  messagesUsed: number;
  messagesLimit: number;
  startedAt: string;
  expiresAt: string | null;
}

export interface Conversation {
  id: number;
  visibleId: string;
  agentType: string;
  title: string;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  agentType: string;
  createdAt: string;
  files?: string[];
}

export interface TokenSpending {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface AgentTask {
  id: number;
  agentType: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  completedAt: string | null;
}
