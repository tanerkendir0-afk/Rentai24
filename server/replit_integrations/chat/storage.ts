import { db } from "../../db";
import { conversations, chatMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { ConversationRecord, ChatMessage } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<ConversationRecord | undefined>;
  getAllConversations(): Promise<ConversationRecord[]>;
  createConversation(title: string, userId?: number, agentType?: string): Promise<ConversationRecord>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<ChatMessage[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<ChatMessage>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db.select().from(conversations).orderBy(desc(conversations.createdAt));
  },

  async createConversation(title: string, userId?: number, agentType?: string) {
    const visibleId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [conversation] = await db.insert(conversations).values({
      title,
      visibleId,
      userId: userId ?? 1,
      agentType: agentType ?? "chat",
    }).returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    const conv = await this.getConversation(id);
    if (conv) {
      await db.delete(chatMessages).where(eq(chatMessages.sessionId, conv.visibleId));
    }
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    const conv = await this.getConversation(conversationId);
    if (!conv) return [];
    return db.select().from(chatMessages).where(eq(chatMessages.sessionId, conv.visibleId)).orderBy(chatMessages.createdAt);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const conv = await this.getConversation(conversationId);
    const sessionId = conv?.visibleId || String(conversationId);
    const [message] = await db.insert(chatMessages).values({
      sessionId,
      role,
      content,
      agentType: "chat",
    }).returning();
    return message;
  },
};
