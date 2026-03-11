import { z } from "zod";
import { pgTable, serial, text, timestamp, integer, boolean, customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

const vector = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  company: text("company"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
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
  message: z.string().min(1).max(2000),
  agentType: z.string().min(1),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).max(20).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  companySize: z.string().min(1, "Please select your company size"),
  aiWorkerInterest: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type ContactForm = z.infer<typeof contactFormSchema>;
