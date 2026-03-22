import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { Conversation, Message } from "@/types";

export function useChat(agentType: string) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch conversations for this agent
  const { data: conversations = [], refetch: refetchConversations } = useQuery<
    Conversation[]
  >({
    queryKey: ["/api/conversations", agentType],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!agentType,
  });

  // Load conversation messages
  const loadConversation = useCallback(
    async (conversation: Conversation) => {
      setActiveConversation(conversation);
      try {
        const res = await apiRequest(
          "GET",
          `/api/conversations/${conversation.visibleId}/messages`,
        );
        const data = await res.json();
        setMessages(data);
      } catch {
        setMessages([]);
      }
    },
    [],
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string, files?: string[]) => {
      if (!content.trim() && (!files || files.length === 0)) return;

      const userMessage: Message = {
        id: Date.now(),
        conversationId: activeConversation?.id || 0,
        role: "user",
        content,
        agentType,
        createdAt: new Date().toISOString(),
        files,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        abortRef.current = new AbortController();
        const res = await apiRequest("POST", "/api/chat", {
          message: content,
          agentType,
          conversationHistory: [
            ...conversationHistory,
            { role: "user", content },
          ],
          sessionId: activeConversation?.visibleId,
        });
        const data = await res.json();

        const assistantMessage: Message = {
          id: Date.now() + 1,
          conversationId: activeConversation?.id || 0,
          role: "assistant",
          content: data.response || data.message || "",
          agentType,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        refetchConversations();
      } catch (err: any) {
        if (err.name !== "AbortError") {
          const errorMessage: Message = {
            id: Date.now() + 1,
            conversationId: activeConversation?.id || 0,
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            agentType,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [agentType, activeConversation, messages, refetchConversations],
  );

  // Create new conversation
  const newConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(
    async (visibleId: string) => {
      try {
        await apiRequest("DELETE", `/api/conversations/${visibleId}`);
        refetchConversations();
        if (activeConversation?.visibleId === visibleId) {
          setActiveConversation(null);
          setMessages([]);
        }
      } catch {
        // ignore
      }
    },
    [activeConversation, refetchConversations],
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    messages,
    conversations,
    activeConversation,
    isStreaming,
    sendMessage,
    loadConversation,
    newConversation,
    deleteConversation,
    stopStreaming,
    refetchConversations,
  };
}
