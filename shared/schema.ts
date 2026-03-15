import { z } from "zod";
import { pgTable, serial, text, timestamp, integer, boolean, jsonb, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: unknown): number[] {
    return JSON.parse(String(value));
  },
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  fullName: text("full_name").notNull(),
  company: text("company"),
  role: text("role", { enum: ["user", "agent_manager", "admin"] }).notNull().default("user"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  imageCredits: integer("image_credits").notNull().default(0),
  gmailAddress: text("gmail_address"),
  gmailAppPassword: text("gmail_app_password"),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailAccessToken: text("gmail_access_token"),
  gmailTokenExpiry: timestamp("gmail_token_expiry"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const rentals = pgTable("rentals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  agentType: text("agent_type").notNull(),
  plan: text("plan").notNull().default("starter"),
  status: text("status").notNull().default("active"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(100),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at"),
});

export const agentDocuments = pgTable("agent_documents", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  chunkCount: integer("chunk_count").notNull().default(0),
  fileSize: integer("file_size").default(0),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const documentChunks = pgTable("document_chunks", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => agentDocuments.id, { onDelete: "cascade" }),
  agentType: text("agent_type").notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: vector("embedding"),
});

export const fineTuningJobs = pgTable("fine_tuning_jobs", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  openaiJobId: text("openai_job_id"),
  openaiFileId: text("openai_file_id"),
  fineTunedModel: text("fine_tuned_model"),
  status: text("status").notNull().default("pending"),
  isActive: boolean("is_active").notNull().default(false),
  trainingFile: text("training_file"),
  error: text("error"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  agentType: text("agent_type").notNull(),
  model: text("model").notNull(),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  costUsd: text("cost_usd").notNull().default("0"),
  operationType: text("operation_type").notNull().default("chat"),
  aiProvider: text("ai_provider").notNull().default("openai"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertTokenUsageSchema = createInsertSchema(tokenUsage).omit({
  id: true,
  createdAt: true,
});

export const insertRentalSchema = createInsertSchema(rentals).omit({
  id: true,
  startedAt: true,
  messagesUsed: true,
});

export const insertAgentDocumentSchema = createInsertSchema(agentDocuments).omit({
  id: true,
  uploadedAt: true,
});

export const insertFineTuningJobSchema = createInsertSchema(fineTuningJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Rental = typeof rentals.$inferSelect;
export type InsertRental = z.infer<typeof insertRentalSchema>;
export type AgentDocument = typeof agentDocuments.$inferSelect;
export type InsertAgentDocument = z.infer<typeof insertAgentDocumentSchema>;
export type FineTuningJob = typeof fineTuningJobs.$inferSelect;
export type InsertFineTuningJob = z.infer<typeof insertFineTuningJobSchema>;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(30),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Full name is required"),
  company: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(8000),
  agentType: z.string().min(1),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(50).optional(),
  sessionId: z.string().max(100).optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  companySize: z.string().min(1, "Please select your company size"),
  aiWorkerInterest: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactForm = z.infer<typeof contactFormSchema>;

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  companySize: text("company_size").notNull(),
  aiWorkerInterest: text("ai_worker_interest"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true,
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

export const newsletterSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  status: text("status").notNull().default("new"),
  score: text("score"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const agentActions = pgTable("agent_actions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  agentType: text("agent_type").notNull(),
  actionType: text("action_type").notNull(),
  description: text("description").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  campaignType: text("campaign_type").notNull().default("standard"),
  steps: jsonb("steps").notNull(),
  currentStep: integer("current_step").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("general"),
  agentType: text("agent_type"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  customerEmail: text("customer_email"),
  resolution: text("resolution"),
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentActionSchema = createInsertSchema(agentActions).omit({
  id: true,
  createdAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const agentTasks = pgTable("agent_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  agentType: text("agent_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("todo"),
  priority: text("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  project: text("project"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentTaskSchema = createInsertSchema(agentTasks).omit({
  id: true,
  createdAt: true,
});

export type AgentTask = typeof agentTasks.$inferSelect;
export type InsertAgentTask = z.infer<typeof insertAgentTaskSchema>;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  visibleId: text("visible_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id),
  agentType: text("agent_type").notNull(),
  title: text("title").notNull().default("New Chat"),
  qualityRating: text("quality_rating"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type ConversationRecord = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  agentType: text("agent_type").notNull(),
  sessionId: text("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  usedTool: boolean("used_tool").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export const bossConversations = pgTable("boss_conversations", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  messages: jsonb("messages").notNull().default([]),
  messageCount: integer("message_count").notNull().default(0),
  toolsUsed: boolean("tools_used").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertBossConversationSchema = createInsertSchema(bossConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type BossConversation = typeof bossConversations.$inferSelect;
export type InsertBossConversation = z.infer<typeof insertBossConversationSchema>;

export const collaborationSessions = pgTable("collaboration_sessions", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  synthesis: text("synthesis").notNull().default(""),
  agentResponses: jsonb("agent_responses").notNull().default([]),
  agentCount: integer("agent_count").notNull().default(0),
  totalCost: text("total_cost").notNull().default("0"),
  totalTokens: integer("total_tokens").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCollaborationSessionSchema = createInsertSchema(collaborationSessions).omit({
  id: true,
  createdAt: true,
});

export type CollaborationSession = typeof collaborationSessions.$inferSelect;
export type InsertCollaborationSession = z.infer<typeof insertCollaborationSessionSchema>;

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  position: text("position"),
  department: text("department"),
  skills: text("skills"),
  responsibilities: text("responsibilities"),
  phone: text("phone"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export const bossNotifications = pgTable("boss_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(),
  teamMemberName: text("team_member_name").notNull(),
  summary: text("summary").notNull(),
  details: jsonb("details"),
  bossResponse: text("boss_response"),
  adminNotified: boolean("admin_notified").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertBossNotificationSchema = createInsertSchema(bossNotifications).omit({
  id: true,
  createdAt: true,
});

export type BossNotification = typeof bossNotifications.$inferSelect;
export type InsertBossNotification = z.infer<typeof insertBossNotificationSchema>;

export const socialAccounts = pgTable("social_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  profileUrl: text("profile_url"),
  accessToken: text("access_token"),
  accountType: text("account_type").notNull().default("personal"),
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  accessTokenSecret: text("access_token_secret"),
  pageId: text("page_id"),
  businessAccountId: text("business_account_id"),
  status: text("status").notNull().default("connected"),
  connectedAt: timestamp("connected_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSocialAccountSchema = createInsertSchema(socialAccounts).omit({
  id: true,
  connectedAt: true,
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = z.infer<typeof insertSocialAccountSchema>;

export const shippingProviders = pgTable("shipping_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  provider: text("provider").notNull(),
  apiKey: text("api_key").notNull(),
  customerCode: text("customer_code"),
  username: text("username"),
  password: text("password"),
  accountNumber: text("account_number"),
  siteId: text("site_id"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertShippingProviderSchema = createInsertSchema(shippingProviders).omit({
  id: true,
  createdAt: true,
});

export type ShippingProvider = typeof shippingProviders.$inferSelect;
export type InsertShippingProvider = z.infer<typeof insertShippingProviderSchema>;

export const guardrailLogs = pgTable("guardrail_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  agentType: text("agent_type").notNull(),
  ruleType: text("rule_type").notNull(),
  reason: text("reason").notNull(),
  inputPreview: text("input_preview"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertGuardrailLogSchema = createInsertSchema(guardrailLogs).omit({
  id: true,
  createdAt: true,
});

export type GuardrailLog = typeof guardrailLogs.$inferSelect;
export type InsertGuardrailLog = z.infer<typeof insertGuardrailLogSchema>;

export const scheduledPosts = pgTable("scheduled_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: text("platform").notNull(),
  accountId: integer("account_id").references(() => socialAccounts.id),
  content: text("content").notNull(),
  hashtags: text("hashtags"),
  imageUrl: text("image_url"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").notNull().default("pending"),
  publishedAt: timestamp("published_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({
  id: true,
  createdAt: true,
});

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;

export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  phoneNumberId: text("phone_number_id").notNull(),
  businessAccountId: text("business_account_id"),
  accessToken: text("access_token").notNull(),
  verifyToken: text("verify_token").notNull(),
  displayName: text("display_name"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWhatsappConfigSchema = createInsertSchema(whatsappConfig).omit({
  id: true,
  createdAt: true,
});

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = z.infer<typeof insertWhatsappConfigSchema>;

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  agentType: text("agent_type"),
  direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerName: text("customer_name"),
  messageType: text("message_type", { enum: ["text", "template", "image", "document"] }).notNull().default("text"),
  content: text("content").notNull(),
  templateName: text("template_name"),
  whatsappMessageId: text("whatsapp_message_id"),
  status: text("status", { enum: ["sent", "delivered", "read", "failed", "received"] }).notNull().default("sent"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  id: true,
  createdAt: true,
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

export const agentLimits = pgTable("agent_limits", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull(),
  period: text("period", { enum: ["daily", "weekly", "monthly"] }).notNull(),
  tokenLimit: integer("token_limit").notNull().default(0),
  messageLimit: integer("message_limit").notNull().default(0),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentLimitSchema = createInsertSchema(agentLimits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AgentLimit = typeof agentLimits.$inferSelect;
export type InsertAgentLimit = z.infer<typeof insertAgentLimitSchema>;

export const securityEvents = pgTable("security_events", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  eventType: text("event_type", { enum: ["distillation_attempt", "guardrail_block", "rate_limit", "suspicious_pattern"] }).notNull(),
  endpoint: text("endpoint"),
  userAgent: text("user_agent"),
  userId: integer("user_id").references(() => users.id),
  detail: text("detail"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
});

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type AgentAction = typeof agentActions.$inferSelect;
export type InsertAgentAction = z.infer<typeof insertAgentActionSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;

export const escalationRules = pgTable("escalation_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["angry_customer", "repeated_failure", "sensitive_topic"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  keywords: text("keywords").array().notNull().default([]),
  threshold: integer("threshold").notNull().default(2),
  escalationMessage: text("escalation_message").notNull(),
  priority: text("priority", { enum: ["low", "medium", "high", "critical"] }).notNull().default("medium"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEscalationRuleSchema = createInsertSchema(escalationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = z.infer<typeof insertEscalationRuleSchema>;

export const escalations = pgTable("escalations", {
  id: serial("id").primaryKey(),
  uniqueToken: text("unique_token").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  agentType: text("agent_type").notNull(),
  ruleId: integer("rule_id").references(() => escalationRules.id),
  reason: text("reason").notNull(),
  userMessage: text("user_message").notNull(),
  chatHistory: jsonb("chat_history").default([]),
  sessionId: text("session_id"),
  status: text("status", { enum: ["pending", "admin_joined", "resolved", "dismissed"] }).notNull().default("pending"),
  adminJoinedAt: timestamp("admin_joined_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertEscalationSchema = createInsertSchema(escalations).omit({
  id: true,
  createdAt: true,
});

export type Escalation = typeof escalations.$inferSelect;
export type InsertEscalation = z.infer<typeof insertEscalationSchema>;

export const escalationMessages = pgTable("escalation_messages", {
  id: serial("id").primaryKey(),
  escalationId: integer("escalation_id").notNull().references(() => escalations.id),
  senderType: text("sender_type", { enum: ["user", "admin"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEscalationMessageSchema = createInsertSchema(escalationMessages).omit({
  id: true,
  createdAt: true,
});

export type EscalationMessage = typeof escalationMessages.$inferSelect;
export type InsertEscalationMessage = z.infer<typeof insertEscalationMessageSchema>;

export const agentInstructions = pgTable("agent_instructions", {
  id: serial("id").primaryKey(),
  agentType: text("agent_type").notNull().unique(),
  instructions: text("instructions").notNull().default(""),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentInstructionSchema = createInsertSchema(agentInstructions).omit({
  id: true,
  updatedAt: true,
});

export type AgentInstruction = typeof agentInstructions.$inferSelect;
export type InsertAgentInstruction = z.infer<typeof insertAgentInstructionSchema>;

export const globalAgentInstructions = pgTable("global_agent_instructions", {
  id: serial("id").primaryKey(),
  instructions: text("instructions").notNull().default(""),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type GlobalAgentInstruction = typeof globalAgentInstructions.$inferSelect;

export const crmDocuments = pgTable("crm_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  content: text("content"),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCrmDocumentSchema = createInsertSchema(crmDocuments).omit({
  id: true,
  uploadedAt: true,
});

export type CrmDocument = typeof crmDocuments.$inferSelect;
export type InsertCrmDocument = z.infer<typeof insertCrmDocumentSchema>;
