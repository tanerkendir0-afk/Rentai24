import { db } from "./db";
import { users, rentals, contactMessages, newsletterSubscribers, leads, agentActions, emailCampaigns, supportTickets, tokenUsage, agentTasks, chatMessages, systemSettings, type User, type InsertUser, type Rental, type InsertRental, type ContactMessage, type InsertContactMessage, type NewsletterSubscriber, type Lead, type InsertLead, type AgentAction, type InsertAgentAction, type EmailCampaign, type InsertEmailCampaign, type SupportTicket, type InsertSupportTicket, type TokenUsage, type InsertTokenUsage, type AgentTask, type InsertAgentTask, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByStripeCustomerId(customerId: string): Promise<User | undefined>;
  updateUserStripeInfo(userId: number, info: { stripeCustomerId?: string; stripeSubscriptionId?: string | null }): Promise<User | undefined>;
  updateUserProfile(userId: number, updates: { fullName?: string; company?: string | null }): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined>;
  addImageCredits(userId: number, credits: number): Promise<User | undefined>;
  useImageCredit(userId: number): Promise<boolean>;

  createRental(rental: InsertRental): Promise<Rental>;
  getRentalsByUser(userId: number): Promise<Rental[]>;
  getActiveRental(userId: number, agentType: string): Promise<Rental | undefined>;
  incrementUsage(rentalId: number): Promise<void>;
  activateUserRentals(userId: number): Promise<void>;
  deactivateUserRentals(userId: number): Promise<void>;

  getProduct(productId: string): Promise<any>;
  listProducts(active?: boolean): Promise<any[]>;
  listProductsWithPrices(active?: boolean): Promise<any[]>;
  getPrice(priceId: string): Promise<any>;
  getSubscription(subscriptionId: string): Promise<any>;

  createContactMessage(msg: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  createNewsletterSubscriber(email: string): Promise<NewsletterSubscriber>;
  getNewsletterSubscribers(): Promise<NewsletterSubscriber[]>;

  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByUser(userId: number): Promise<Lead[]>;
  getLeadById(id: number, userId: number): Promise<Lead | undefined>;
  updateLead(id: number, userId: number, updates: Partial<Pick<Lead, "name" | "email" | "company" | "status" | "notes" | "score">>): Promise<Lead | undefined>;

  createAgentAction(action: InsertAgentAction): Promise<AgentAction>;
  getActionsByUser(userId: number): Promise<AgentAction[]>;

  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  getCampaignsByUser(userId: number): Promise<EmailCampaign[]>;
  getActiveCampaigns(userId: number): Promise<EmailCampaign[]>;
  updateCampaignStep(id: number, userId: number, currentStep: number, status?: string): Promise<EmailCampaign | undefined>;

  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getTicketsByUser(userId: number): Promise<SupportTicket[]>;
  getTicketById(id: number, userId: number): Promise<SupportTicket | undefined>;
  updateTicket(id: number, userId: number, updates: Partial<Pick<SupportTicket, "status" | "priority" | "resolution" | "subject" | "description">>): Promise<SupportTicket | undefined>;

  createAgentTask(task: InsertAgentTask): Promise<AgentTask>;
  getAgentTasksByUser(userId: number, agentType?: string): Promise<AgentTask[]>;
  updateAgentTask(id: number, userId: number, updates: Partial<Pick<AgentTask, "title" | "description" | "status" | "priority" | "dueDate" | "project">>): Promise<AgentTask | undefined>;
  deleteAgentTask(id: number, userId: number): Promise<boolean>;

  logTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage>;
  getTokenUsageSummary(): Promise<any[]>;
  getTokenUsageDetailed(minCostUsd?: number): Promise<any[]>;
  getTokenSpending(userId: number | null, agentType?: string): Promise<number>;

  saveChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByAgent(agentType: string, filters?: { startDate?: Date; endDate?: Date }): Promise<ChatMessage[]>;
  getChatSessionsByAgent(agentType: string, filters?: { startDate?: Date; endDate?: Date; minTurns?: number; toolUsageOnly?: boolean }): Promise<{ sessionId: string; messages: ChatMessage[] }[]>;

  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createRental(rental: InsertRental): Promise<Rental> {
    const [created] = await db.insert(rentals).values(rental).returning();
    return created;
  }

  async getRentalsByUser(userId: number): Promise<Rental[]> {
    return db.select().from(rentals).where(eq(rentals.userId, userId));
  }

  async getActiveRental(userId: number, agentType: string): Promise<Rental | undefined> {
    const [rental] = await db
      .select()
      .from(rentals)
      .where(and(eq(rentals.userId, userId), eq(rentals.agentType, agentType), eq(rentals.status, "active")));
    return rental;
  }

  async incrementUsage(rentalId: number): Promise<void> {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, rentalId));
    if (rental) {
      await db
        .update(rentals)
        .set({ messagesUsed: rental.messagesUsed + 1 })
        .where(eq(rentals.id, rentalId));
    }
  }

  async getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
    return user;
  }

  async updateUserStripeInfo(userId: number, info: { stripeCustomerId?: string; stripeSubscriptionId?: string | null }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(info).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserProfile(userId: number, updates: { fullName?: string; company?: string | null }): Promise<User | undefined> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();
    return updated;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async addImageCredits(userId: number, credits: number): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ imageCredits: sql`${users.imageCredits} + ${credits}` })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async useImageCredit(userId: number): Promise<boolean> {
    const result = await db.update(users)
      .set({ imageCredits: sql`${users.imageCredits} - 1` })
      .where(and(eq(users.id, userId), sql`${users.imageCredits} > 0`))
      .returning();
    return result.length > 0;
  }

  async activateUserRentals(userId: number): Promise<void> {
    await db.update(rentals).set({ status: 'active' }).where(
      and(eq(rentals.userId, userId), eq(rentals.status, 'inactive'))
    );
  }

  async deactivateUserRentals(userId: number): Promise<void> {
    await db.update(rentals).set({ status: 'inactive' }).where(
      and(eq(rentals.userId, userId), eq(rentals.status, 'active'))
    );
  }

  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts(active = true) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = ${active}`
    );
    return result.rows;
  }

  async listProductsWithPrices(active = true) {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active,
          pr.metadata as price_metadata
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = ${active}
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getPrice(priceId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.prices WHERE id = ${priceId}`
    );
    return result.rows[0] || null;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  async createContactMessage(msg: InsertContactMessage): Promise<ContactMessage> {
    const [created] = await db.insert(contactMessages).values(msg).returning();
    return created;
  }

  async getContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async createNewsletterSubscriber(email: string): Promise<NewsletterSubscriber> {
    const [created] = await db.insert(newsletterSubscribers).values({ email }).returning();
    return created;
  }

  async getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
    return db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.subscribedAt));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async getLeadsByUser(userId: number): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.userId, userId)).orderBy(desc(leads.createdAt));
  }

  async getLeadById(id: number, userId: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(and(eq(leads.id, id), eq(leads.userId, userId)));
    return lead;
  }

  async updateLead(id: number, userId: number, updates: Partial<Pick<Lead, "name" | "email" | "company" | "status" | "notes" | "score">>): Promise<Lead | undefined> {
    const [updated] = await db
      .update(leads)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.userId, userId)))
      .returning();
    return updated;
  }

  async createAgentAction(action: InsertAgentAction): Promise<AgentAction> {
    const [created] = await db.insert(agentActions).values(action).returning();
    return created;
  }

  async getActionsByUser(userId: number): Promise<AgentAction[]> {
    return db.select().from(agentActions).where(eq(agentActions.userId, userId)).orderBy(desc(agentActions.createdAt));
  }

  async createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [created] = await db.insert(emailCampaigns).values(campaign).returning();
    return created;
  }

  async getCampaignsByUser(userId: number): Promise<EmailCampaign[]> {
    return db.select().from(emailCampaigns).where(eq(emailCampaigns.userId, userId)).orderBy(desc(emailCampaigns.createdAt));
  }

  async getActiveCampaigns(userId: number): Promise<EmailCampaign[]> {
    return db.select().from(emailCampaigns).where(and(eq(emailCampaigns.userId, userId), eq(emailCampaigns.status, "active"))).orderBy(desc(emailCampaigns.createdAt));
  }

  async updateCampaignStep(id: number, userId: number, currentStep: number, status?: string): Promise<EmailCampaign | undefined> {
    const updates: Record<string, unknown> = { currentStep };
    if (status) updates.status = status;
    const [updated] = await db
      .update(emailCampaigns)
      .set(updates)
      .where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.userId, userId)))
      .returning();
    return updated;
  }
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async getTicketsByUser(userId: number): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  }

  async getTicketById(id: number, userId: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)));
    return ticket;
  }

  async updateTicket(id: number, userId: number, updates: Partial<Pick<SupportTicket, "status" | "priority" | "resolution" | "subject" | "description">>): Promise<SupportTicket | undefined> {
    const [updated] = await db
      .update(supportTickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)))
      .returning();
    return updated;
  }

  async logTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage> {
    const [created] = await db.insert(tokenUsage).values(usage).returning();
    return created;
  }

  async getTokenUsageSummary(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        t.agent_type,
        COALESCE(u.email, 'anonymous') as user_email,
        COALESCE(u.full_name, 'Anonymous') as user_name,
        COUNT(*)::int as request_count,
        SUM(t.prompt_tokens)::int as total_prompt_tokens,
        SUM(t.completion_tokens)::int as total_completion_tokens,
        SUM(t.total_tokens)::int as total_tokens,
        SUM(CAST(t.cost_usd AS DECIMAL(10,6)))::text as total_cost,
        MAX(t.created_at) as last_used
      FROM token_usage t
      LEFT JOIN users u ON t.user_id = u.id
      GROUP BY t.agent_type, u.email, u.full_name
      ORDER BY SUM(CAST(t.cost_usd AS DECIMAL(10,6))) DESC
    `);
    return result.rows;
  }

  async getTokenUsageDetailed(minCostUsd = 0): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        t.id,
        t.user_id,
        COALESCE(u.email, 'anonymous') as user_email,
        COALESCE(u.full_name, 'Anonymous') as user_name,
        t.agent_type,
        t.model,
        t.prompt_tokens,
        t.completion_tokens,
        t.total_tokens,
        t.cost_usd,
        t.operation_type,
        t.created_at
      FROM token_usage t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE CAST(t.cost_usd AS DECIMAL(10,6)) >= ${minCostUsd}
      ORDER BY t.created_at DESC
      LIMIT 500
    `);
    return result.rows;
  }

  async getTokenSpending(userId: number | null, agentType?: string): Promise<number> {
    let result;
    if (userId) {
      if (agentType) {
        result = await db.execute(sql`
          SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total
          FROM token_usage
          WHERE user_id = ${userId} AND agent_type = ${agentType}
        `);
      } else {
        result = await db.execute(sql`
          SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total
          FROM token_usage
          WHERE user_id = ${userId}
        `);
      }
    } else {
      result = await db.execute(sql`
        SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total
        FROM token_usage
        WHERE user_id IS NULL
      `);
    }
    return parseFloat((result.rows[0] as any)?.total || "0");
  }

  async createAgentTask(task: InsertAgentTask): Promise<AgentTask> {
    const [created] = await db.insert(agentTasks).values(task).returning();
    return created;
  }

  async getAgentTasksByUser(userId: number, agentType?: string): Promise<AgentTask[]> {
    if (agentType) {
      return db.select().from(agentTasks).where(and(eq(agentTasks.userId, userId), eq(agentTasks.agentType, agentType))).orderBy(desc(agentTasks.createdAt));
    }
    return db.select().from(agentTasks).where(eq(agentTasks.userId, userId)).orderBy(desc(agentTasks.createdAt));
  }

  async updateAgentTask(id: number, userId: number, updates: Partial<Pick<AgentTask, "title" | "description" | "status" | "priority" | "dueDate" | "project">>): Promise<AgentTask | undefined> {
    const [updated] = await db.update(agentTasks).set(updates).where(and(eq(agentTasks.id, id), eq(agentTasks.userId, userId))).returning();
    return updated;
  }

  async deleteAgentTask(id: number, userId: number): Promise<boolean> {
    const result = await db.delete(agentTasks).where(and(eq(agentTasks.id, id), eq(agentTasks.userId, userId))).returning();
    return result.length > 0;
  }

  async saveChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    try {
      const [created] = await db.insert(chatMessages).values(message).returning();
      return created;
    } catch (err: any) {
      if (err.message?.includes('used_tool') || err.message?.includes('column')) {
        const { usedTool, ...withoutTool } = message as any;
        const [created] = await db.insert(chatMessages).values(withoutTool).returning();
        return created;
      }
      throw err;
    }
  }

  async getChatMessagesByAgent(agentType: string, filters?: { startDate?: Date; endDate?: Date }): Promise<ChatMessage[]> {
    const conditions = [eq(chatMessages.agentType, agentType)];
    if (filters?.startDate) conditions.push(gte(chatMessages.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(chatMessages.createdAt, filters.endDate));
    return db.select().from(chatMessages).where(and(...conditions)).orderBy(chatMessages.sessionId, chatMessages.createdAt);
  }

  async getChatSessionsByAgent(
    agentType: string,
    filters?: { startDate?: Date; endDate?: Date; minTurns?: number; toolUsageOnly?: boolean }
  ): Promise<{ sessionId: string; messages: ChatMessage[] }[]> {
    const allMessages = await this.getChatMessagesByAgent(agentType, {
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });

    const sessionsMap = new Map<string, ChatMessage[]>();
    for (const msg of allMessages) {
      const existing = sessionsMap.get(msg.sessionId) || [];
      existing.push(msg);
      sessionsMap.set(msg.sessionId, existing);
    }

    let sessions = Array.from(sessionsMap.entries()).map(([sessionId, messages]) => ({
      sessionId,
      messages,
    }));

    if (filters?.minTurns && filters.minTurns > 0) {
      sessions = sessions.filter((s) => {
        const userTurns = s.messages.filter((m) => m.role === "user").length;
        return userTurns >= (filters.minTurns || 1);
      });
    }

    if (filters?.toolUsageOnly) {
      sessions = sessions.filter((s) => s.messages.some((m) => m.usedTool));
    }

    return sessions;
  }

  async getSystemSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return row?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }
}

export const storage = new DatabaseStorage();
