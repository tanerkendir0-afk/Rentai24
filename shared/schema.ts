import { z } from "zod";
import { pgTable, pgEnum, serial, text, timestamp, integer, boolean, jsonb, customType, decimal, date, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});

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
  language: text("language").notNull().default("en"),
  cookieConsent: boolean("cookie_consent").notNull().default(false),
  dataProcessingConsent: boolean("data_processing_consent").notNull().default(false),
  industry: text("industry"),
  companySize: text("company_size"),
  country: text("country"),
  intendedAgents: text("intended_agents").array(),
  referralSource: text("referral_source"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  branding: jsonb("branding").default({}),
  tokenSpendingLimit: decimal("token_spending_limit", { precision: 10, scale: 2 }).notNull().default("5.00"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const rentals = pgTable("rentals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  agentType: text("agent_type").notNull(),
  plan: text("plan").notNull().default("standard"),
  status: text("status").notNull().default("active"),
  messagesUsed: integer("messages_used").notNull().default(0),
  messagesLimit: integer("messages_limit").notNull().default(75),
  dailyMessagesUsed: integer("daily_messages_used").notNull().default(0),
  dailyResetAt: timestamp("daily_reset_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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

export interface UserBranding {
  company_name?: string;
  logo_base64?: string;
  theme?: {
    primary: string;
    accent: string;
    light: string;
    text: string;
  };
  footer_text?: string;
  show_powered_by?: boolean;
}
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
  kvkkConsent: z.boolean().refine(val => val === true, { message: "KVKK consent is required" }),
  dataProcessingConsent: z.boolean().refine(val => val === true, { message: "Data processing consent is required" }),
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
    content: z.string().max(16000),
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

export const consentLogs = pgTable("consent_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  consentType: text("consent_type", { enum: ["cookie", "dataProcessing", "kvkk"] }).notNull(),
  granted: boolean("granted").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConsentLogSchema = createInsertSchema(consentLogs).omit({
  id: true,
  createdAt: true,
});

export type ConsentLog = typeof consentLogs.$inferSelect;
export type InsertConsentLog = z.infer<typeof insertConsentLogSchema>;

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

export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  path: text("path").notNull(),
  duration: integer("duration"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertPageViewSchema = createInsertSchema(pageViews).omit({
  id: true,
  createdAt: true,
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = z.infer<typeof insertPageViewSchema>;

export const userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  eventName: text("event_name").notNull(),
  eventCategory: text("event_category").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserEventSchema = createInsertSchema(userEvents).omit({
  id: true,
  createdAt: true,
});

export type UserEvent = typeof userEvents.$inferSelect;
export type InsertUserEvent = z.infer<typeof insertUserEventSchema>;

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["nps", "chat_rating", "general"] }).notNull(),
  score: integer("score"),
  comment: text("comment"),
  agentType: text("agent_type"),
  category: text("category"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  invoiceNo: varchar("invoice_no", { length: 20 }).notNull(),
  invoiceType: varchar("invoice_type", { length: 20 }).default("satis"),
  invoiceDate: date("invoice_date").notNull(),
  dueDate: date("due_date"),
  sellerName: text("seller_name"),
  sellerTaxOffice: text("seller_tax_office"),
  sellerTaxNo: text("seller_tax_no"),
  sellerAddress: text("seller_address"),
  buyerName: text("buyer_name").notNull(),
  buyerTaxOffice: text("buyer_tax_office"),
  buyerTaxNo: text("buyer_tax_no"),
  buyerAddress: text("buyer_address"),
  subtotal: decimal("subtotal", { precision: 15, scale: 2 }),
  kdvRate: integer("kdv_rate").default(20),
  kdvAmount: decimal("kdv_amount", { precision: 15, scale: 2 }),
  tevkifatRate: varchar("tevkifat_rate", { length: 10 }),
  tevkifatAmount: decimal("tevkifat_amount", { precision: 15, scale: 2 }).default("0"),
  total: decimal("total", { precision: 15, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("TRY"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("draft"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).default("Adet"),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  kdvRate: integer("kdv_rate").default(20),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({
  id: true,
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

export const LEAD_SOURCE_VALUES = ["website", "referral", "cold", "event", "ad", "social", "partner"] as const;
export const CUSTOMER_SEGMENT_VALUES = ["enterprise", "mid", "smb"] as const;
export const DEAL_STAGE_VALUES = ["new_lead", "contacted", "qualified", "proposal_sent", "negotiation", "closed_won", "closed_lost"] as const;
export const ACTIVITY_TYPE_VALUES = ["email_sent", "email_received", "call", "meeting", "note", "stage_change", "task", "sequence_event"] as const;
export const SEQUENCE_STATUS_VALUES = ["active", "paused", "completed", "cancelled"] as const;

export type LeadSourceValue = typeof LEAD_SOURCE_VALUES[number];
export type CustomerSegmentValue = typeof CUSTOMER_SEGMENT_VALUES[number];
export type DealStageValue = typeof DEAL_STAGE_VALUES[number];
export type ActivityTypeValue = typeof ACTIVITY_TYPE_VALUES[number];
export type SequenceStatusValue = typeof SEQUENCE_STATUS_VALUES[number];

export const leadSourceEnum = pgEnum("lead_source", LEAD_SOURCE_VALUES);
export const customerSegmentEnum = pgEnum("customer_segment", CUSTOMER_SEGMENT_VALUES);
export const dealStageEnum = pgEnum("deal_stage", DEAL_STAGE_VALUES);
export const activityTypeEnum = pgEnum("activity_type", ACTIVITY_TYPE_VALUES);
export const sequenceStatusEnum = pgEnum("sequence_status", SEQUENCE_STATUS_VALUES);

export const rexContacts = pgTable("rex_contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  companySize: varchar("company_size", { length: 50 }),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  position: varchar("position", { length: 100 }),
  isDecisionMaker: boolean("is_decision_maker").default(false),
  source: leadSourceEnum("source").default("cold"),
  segment: customerSegmentEnum("segment").default("smb"),
  tags: text("tags").array().default([]),
  leadScore: integer("lead_score").default(0),
  scoreFactors: jsonb("score_factors").default({}),
  notes: text("notes"),
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpAt: timestamp("next_follow_up_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRexContactSchema = createInsertSchema(rexContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RexContact = typeof rexContacts.$inferSelect;
export type InsertRexContact = z.infer<typeof insertRexContactSchema>;

export const rexDeals = pgTable("rex_deals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => rexContacts.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  value: decimal("value", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: varchar("currency", { length: 3 }).default("TRY"),
  monthlyRecurring: decimal("monthly_recurring", { precision: 12, scale: 2 }),
  stage: dealStageEnum("stage").default("new_lead"),
  probability: integer("probability").default(10),
  stageEnteredAt: timestamp("stage_entered_at").default(sql`CURRENT_TIMESTAMP`),
  expectedClose: date("expected_close"),
  actualClose: date("actual_close"),
  lossReason: varchar("loss_reason", { length: 255 }),
  competitorLostTo: varchar("competitor_lost_to", { length: 255 }),
  assignedTo: varchar("assigned_to", { length: 100 }),
  products: jsonb("products").default([]),
  customFields: jsonb("custom_fields").default({}),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRexDealSchema = createInsertSchema(rexDeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RexDeal = typeof rexDeals.$inferSelect;
export type InsertRexDeal = z.infer<typeof insertRexDealSchema>;

export const rexActivities = pgTable("rex_activities", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => rexContacts.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id", { length: 36 }).references(() => rexDeals.id, { onDelete: "set null" }),
  type: activityTypeEnum("type").notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  durationMinutes: integer("duration_minutes"),
  emailMessageId: varchar("email_message_id", { length: 255 }),
  emailOpened: boolean("email_opened").default(false),
  emailClicked: boolean("email_clicked").default(false),
  emailReplied: boolean("email_replied").default(false),
  metadata: jsonb("metadata").default({}),
  generatedBy: varchar("generated_by", { length: 50 }).default("rex"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRexActivitySchema = createInsertSchema(rexActivities).omit({
  id: true,
  createdAt: true,
});

export type RexActivity = typeof rexActivities.$inferSelect;
export type InsertRexActivity = z.infer<typeof insertRexActivitySchema>;

export const rexSequences = pgTable("rex_sequences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => rexContacts.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id", { length: 36 }).references(() => rexDeals.id, { onDelete: "set null" }),
  sequenceName: varchar("sequence_name", { length: 100 }).notNull(),
  status: sequenceStatusEnum("status").default("active"),
  currentStep: integer("current_step").default(0),
  totalSteps: integer("total_steps").notNull(),
  nextActionAt: timestamp("next_action_at"),
  pausedAt: timestamp("paused_at"),
  completedAt: timestamp("completed_at"),
  emailsSent: integer("emails_sent").default(0),
  emailsOpened: integer("emails_opened").default(0),
  emailsReplied: integer("emails_replied").default(0),
  sequenceConfig: jsonb("sequence_config").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertRexSequenceSchema = createInsertSchema(rexSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type RexSequence = typeof rexSequences.$inferSelect;
export type InsertRexSequence = z.infer<typeof insertRexSequenceSchema>;

export const rexStageHistory = pgTable("rex_stage_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id", { length: 36 }).notNull().references(() => rexDeals.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  fromStage: dealStageEnum("from_stage"),
  toStage: dealStageEnum("to_stage").notNull(),
  changedBy: varchar("changed_by", { length: 100 }).default("rex"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type RexStageHistory = typeof rexStageHistory.$inferSelect;

export const rexScoreHistory = pgTable("rex_score_history", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id", { length: 36 }).notNull().references(() => rexContacts.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  oldScore: integer("old_score"),
  newScore: integer("new_score").notNull(),
  scoreFactors: jsonb("score_factors").notNull(),
  triggerEvent: varchar("trigger_event", { length: 100 }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type RexScoreHistory = typeof rexScoreHistory.$inferSelect;

export const rexStageConfig = pgTable("rex_stage_config", {
  stage: dealStageEnum("stage").primaryKey(),
  slaDays: integer("sla_days").notNull(),
  defaultProbability: integer("default_probability").notNull(),
  autoActions: jsonb("auto_actions").default([]),
});

export type RexStageConfig = typeof rexStageConfig.$inferSelect;

export const marketplaceConnections = pgTable("marketplace_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: varchar("platform", { length: 50 }).notNull(),
  storeName: varchar("store_name", { length: 255 }),
  credentialsEncrypted: text("credentials_encrypted").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMarketplaceConnectionSchema = createInsertSchema(marketplaceConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MarketplaceConnection = typeof marketplaceConnections.$inferSelect;
export type InsertMarketplaceConnection = z.infer<typeof insertMarketplaceConnectionSchema>;

export const marketplaceOrdersCache = pgTable("marketplace_orders_cache", {
  id: serial("id").primaryKey(),
  connectionId: integer("connection_id").references(() => marketplaceConnections.id),
  platformOrderId: varchar("platform_order_id", { length: 255 }),
  orderNumber: varchar("order_number", { length: 100 }),
  status: varchar("status", { length: 50 }),
  customerName: varchar("customer_name", { length: 255 }),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("TRY"),
  orderDate: timestamp("order_date"),
  items: jsonb("items"),
  shippingInfo: jsonb("shipping_info"),
  lastSyncedAt: timestamp("last_synced_at"),
  rawData: jsonb("raw_data"),
});

export type MarketplaceOrderCache = typeof marketplaceOrdersCache.$inferSelect;

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  originalName: varchar("original_name", { length: 500 }).notNull(),
  storedPath: text("stored_path").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(),
  fileSize: integer("file_size"),
  rowCount: integer("row_count"),
  columnNames: jsonb("column_names"),
  summary: jsonb("summary"),
  uploadedAt: timestamp("uploaded_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadedAt: true,
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  postingId: text("posting_id").notNull().unique(),
  title: text("title").notNull(),
  department: text("department").notNull().default("General"),
  type: text("type").notNull().default("full-time"),
  description: text("description").notNull(),
  requirements: text("requirements").notNull().default(""),
  requiredSkills: text("required_skills").array().notNull().default([]),
  salaryRange: text("salary_range"),
  location: text("location"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  linkedinUrl: text("linkedin_url"),
  skills: text("skills").array().notNull().default([]),
  cvText: text("cv_text"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id),
  jobPostingId: integer("job_posting_id").notNull().references(() => jobPostings.id),
  status: text("status").notNull().default("new"),
  score: integer("score"),
  interviewDate: timestamp("interview_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export const WORKFLOW_TRIGGER_TYPES = [
  "agent_tool_complete",
  "webhook",
  "schedule",
  "manual",
  "threshold",
  "email_received",
] as const;

export const WORKFLOW_NODE_TYPES = [
  "trigger",
  "action",
  "condition",
  "delay",
  "loop",
] as const;

export const WORKFLOW_ACTION_TYPES = [
  "send_email",
  "create_task",
  "notify_owner",
  "notify_boss",
  "update_lead",
  "generate_pdf",
  "webhook_call",
  "log_action",
  "calculate",
  "http_request",
  "set_variable",
  "format_data",
  "whatsapp_message",
  "multi_email",
  "db_query",
  "run_skill",
] as const;

export const SKILL_TYPES = ["builtin", "http", "prompt", "expression"] as const;
export const SKILL_CATEGORIES = [
  "data_processing", "text_analysis", "communication", "calculation",
  "integration", "file_ops", "ai_powered", "utility",
] as const;

export const agentSkills = pgTable("agent_skills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  nameTr: text("name_tr").notNull(),
  description: text("description").notNull(),
  descriptionTr: text("description_tr"),
  category: text("category").notNull(),
  skillType: text("skill_type").notNull().default("builtin"),
  icon: text("icon"),
  config: jsonb("config").notNull().default({}),
  parameters: jsonb("parameters").notNull().default([]),
  keywords: text("keywords").array(),
  isActive: boolean("is_active").notNull().default(true),
  isBuiltin: boolean("is_builtin").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  totalDurationMs: integer("total_duration_ms").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const agentSkillAssignments = pgTable("agent_skill_assignments", {
  id: serial("id").primaryKey(),
  skillId: integer("skill_id").notNull().references(() => agentSkills.id, { onDelete: "cascade" }),
  agentSlug: text("agent_slug").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAgentSkillSchema = createInsertSchema(agentSkills).omit({
  id: true,
  createdAt: true,
  usageCount: true,
  successCount: true,
  totalDurationMs: true,
});

export const insertAgentSkillAssignmentSchema = createInsertSchema(agentSkillAssignments).omit({
  id: true,
  createdAt: true,
});

export type AgentSkill = typeof agentSkills.$inferSelect;
export type InsertAgentSkill = z.infer<typeof insertAgentSkillSchema>;
export type AgentSkillAssignment = typeof agentSkillAssignments.$inferSelect;
export type InsertAgentSkillAssignment = z.infer<typeof insertAgentSkillAssignmentSchema>;

export interface SkillParameter {
  name: string;
  label: string;
  labelTr: string;
  type: "string" | "number" | "boolean" | "text" | "select" | "json";
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  options?: string[];
  description?: string;
}

export const automationWorkflows = pgTable("automation_workflows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").notNull().default({}),
  nodes: jsonb("nodes").notNull().default([]),
  isActive: boolean("is_active").notNull().default(false),
  templateId: text("template_id"),
  lastRunAt: timestamp("last_run_at"),
  runCount: integer("run_count").notNull().default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAutomationWorkflowSchema = createInsertSchema(automationWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  runCount: true,
});

export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type InsertAutomationWorkflow = z.infer<typeof insertAutomationWorkflowSchema>;

export const automationExecutions = pgTable("automation_executions", {
  id: serial("id").primaryKey(),
  workflowId: integer("workflow_id").notNull().references(() => automationWorkflows.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("running"),
  triggerData: jsonb("trigger_data"),
  nodeResults: jsonb("node_results").notNull().default([]),
  error: text("error"),
  startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertAutomationExecutionSchema = createInsertSchema(automationExecutions).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = z.infer<typeof insertAutomationExecutionSchema>;

export interface WorkflowNode {
  id: string;
  type: typeof WORKFLOW_NODE_TYPES[number];
  actionType?: typeof WORKFLOW_ACTION_TYPES[number];
  label: string;
  config: Record<string, any>;
  nextNodeId?: string | null;
  conditionTrueNodeId?: string;
  conditionFalseNodeId?: string;
  onErrorNodeId?: string | null;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  position?: { x: number; y: number };
  conditions?: ConditionRule[];
  conditionLogic?: "and" | "or";
}

export interface ConditionRule {
  field: string;
  operator: string;
  value?: any;
}

export interface TriggerConfig {
  toolName?: string;
  agentType?: string;
  actionType?: string;
  webhookPath?: string;
  webhookSecret?: string;
  cronExpression?: string;
  scheduleType?: "daily" | "weekly" | "monthly" | "custom";
  scheduleHour?: number;
  scheduleMinute?: number;
  scheduleDaysOfWeek?: number[];
  scheduleDayOfMonth?: number;
  thresholdField?: string;
  thresholdOperator?: "gt" | "lt" | "gte" | "lte" | "eq";
  thresholdValue?: number;
  senderFilter?: string;
  subjectFilter?: string;
  targetEmail?: string;
}
