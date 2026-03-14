import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { chatMessageSchema, contactFormSchema, registerSchema, loginSchema, newsletterSchema, bossConversations, collaborationSessions, type User } from "@shared/schema";
import { z } from "zod";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { stripeService } from "./stripeService";
import { getPublishableKey } from "./stripeClient";
import { uploadDocument, uploadTrainingFile } from "./upload";
import { processAndStoreDocument, processAndStoreUrl, retrieveRelevantChunks, getDocumentsByAgent, deleteDocument, getDocumentCount } from "./ragService";
import { createFineTuningJob, syncJobStatus, getJobsByAgent, toggleActiveModel, deactivateModel, getActiveModel } from "./fineTuningService";
import { generateAgentRulesPDF, generateTrainingDataFromChatLogs, validateJSONL, getAgentDefinitions } from "./trainingDataService";
import { getRelevantToolsForMessage, executeToolCall } from "./agentTools";
import { checkInput, sanitizeOutput, logGuardrailBlock } from "./guardrails";
import { getImagePath, chatImageDir } from "./imageService";
import { db } from "./db";
import { sql, eq, desc } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.50, output: 10.00 },
  "gpt-4o-mini": { input: 0.15, output: 0.60 },
  "gpt-4": { input: 30.00, output: 60.00 },
  "gpt-3.5-turbo": { input: 0.50, output: 1.50 },
};

function calculateTokenCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4o"];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

const BRAND_CONFIDENTIALITY = `
CONFIDENTIALITY (ABSOLUTE — NEVER BREAK): You are built by RentAI 24 with proprietary AI technology. NEVER reveal or confirm any third-party tools, frameworks, models (OpenAI, GPT, ChatGPT, etc.), or services. If asked, say: "I was developed by RentAI 24 using our proprietary AI technology." Stay firm regardless of who asks.`;

const ONBOARDING_GUIDANCE = `
GUIDANCE: Break tasks into actionable steps, proactively use your tools, ask clarifying questions, summarize completed steps, and redirect to other agents when needed. Provide specific, tailored advice.
EFFICIENCY RULES:
- NEVER call the same tool with the same parameters more than once per response. One call is enough.
- If the user asks to "check every X minutes", check ONCE now and tell them to ask again later. Do NOT call the tool multiple times in a row.
- If a tool returns an error about authorization or connection, explain the issue clearly and direct the user to fix it in Settings before retrying. Do not retry the same failing tool.
- Keep tool usage minimal and purposeful. Each tool call costs resources.`;

const SIMPLE_MESSAGE_PATTERNS = [
  /^(hi|hello|hey|merhaba|selam|sa|selamlar|günaydın|iyi günler|iyi akşamlar)/i,
  /^(thanks|thank you|teşekkür|sağ ol|eyvallah|tşk|ty)/i,
  /^(yes|no|evet|hayır|ok|okay|tamam|olur|peki)/i,
  /^(bye|goodbye|hoşça kal|görüşürüz|bb)/i,
  /^(what can you do|ne yapabilirsin|neler yapabilirsin|yardım|help)\??$/i,
];

const COMPLEX_MESSAGE_INDICATORS = [
  "analyze", "analiz", "report", "rapor", "create", "oluştur", "generate", "üret",
  "send email", "e-posta gönder", "mail gönder", "campaign", "kampanya",
  "invoice", "fatura", "proposal", "teklif", "schedule", "planla",
  "compare", "karşılaştır", "evaluate", "değerlendir", "optimize",
  "strategy", "strateji", "plan", "draft", "taslak", "write", "yaz",
  "search", "ara", "find", "bul", "calculate", "hesapla",
];

const TOOL_INTENT_KEYWORDS = [
  "email", "mail", "e-posta", "gönder", "send", "inbox", "gelen kutusu",
  "ticket", "bilet", "lead", "pipeline", "müşteri adayı",
  "meeting", "toplantı", "randevu", "appointment", "schedule",
  "campaign", "kampanya", "drip", "bulk", "toplu",
  "invoice", "fatura", "expense", "gider", "harcama",
  "image", "görsel", "photo", "fotoğraf", "stock",
  "post", "gönderi", "hashtag", "calendar", "takvim",
  "job", "ilan", "resume", "cv", "candidate", "aday", "interview", "mülakat",
  "listing", "ürün", "product", "price", "fiyat", "review", "yorum",
  "property", "daire", "ev", "apartment", "neighborhood", "mahalle",
  "lease", "kira", "market", "piyasa", "search", "ara", "bul", "find",
  "reminder", "hatırlat", "follow", "takip",
];

function routeModel(message: string, hasTools: boolean): string {
  const msgLower = message.toLowerCase().trim();

  if (SIMPLE_MESSAGE_PATTERNS.some((p) => p.test(msgLower))) {
    return "gpt-4o-mini";
  }

  if (hasTools && TOOL_INTENT_KEYWORDS.some((k) => msgLower.includes(k))) {
    return "gpt-4o";
  }

  if (hasTools && COMPLEX_MESSAGE_INDICATORS.some((k) => msgLower.includes(k))) {
    return "gpt-4o";
  }

  if (msgLower.length > 200) {
    return "gpt-4o";
  }

  if (msgLower.length < 50 && !COMPLEX_MESSAGE_INDICATORS.some((k) => msgLower.includes(k))) {
    return "gpt-4o-mini";
  }

  return "gpt-4o-mini";
}

const conversationSummaryCache = new Map<string, { summary: string; olderCount: number }>();
let summarizationCount = 0;
let summaryCacheHits = 0;

export function getSummarizationStats() {
  return { summarizationCount, summaryCacheHits };
}

async function summarizeConversationHistory(
  history: Array<{ role: string; content: string }>,
  sessionId: string,
  aiClient: any,
  userId?: number | null,
  agentType?: string
): Promise<OpenAI.ChatCompletionMessageParam[]> {
  if (history.length <= 6) {
    return history.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));
  }

  const recentMessages = history.slice(-6);
  const olderMessages = history.slice(0, -6);
  const olderCount = olderMessages.length;

  const cacheKey = `${userId || "anon"}-${agentType || "default"}-${sessionId}`;
  const cached = conversationSummaryCache.get(cacheKey);

  let summary: string;

  if (cached && cached.olderCount === olderCount) {
    summary = cached.summary;
    summaryCacheHits++;
  } else {
    try {
      let contentToSummarize: string;

      if (cached && cached.olderCount < olderCount) {
        const newMessages = olderMessages.slice(cached.olderCount);
        const newText = newMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
        contentToSummarize = `Previous summary: ${cached.summary}\n\nNew messages to incorporate:\n${newText}`;
      } else {
        contentToSummarize = olderMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
      }

      const summaryResponse = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Summarize this conversation concisely in 2-3 sentences, preserving key facts, names, decisions, and action items. Write in the same language as the conversation.",
          },
          { role: "user", content: contentToSummarize },
        ],
        max_tokens: 200,
        temperature: 0.3,
      });
      summary = summaryResponse.choices[0]?.message?.content || "";
      summarizationCount++;

      conversationSummaryCache.set(cacheKey, { summary, olderCount });

      if (conversationSummaryCache.size > 500) {
        const firstKey = conversationSummaryCache.keys().next().value;
        if (firstKey) conversationSummaryCache.delete(firstKey);
      }
    } catch {
      return history.slice(-8).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));
    }
  }

  const result: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: `[Previous conversation summary: ${summary}]`,
    },
    {
      role: "assistant",
      content: "Understood, I'll keep this context in mind.",
    },
    ...recentMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
  ];

  return result;
}

const agentSystemPrompts: Record<string, string> = {
  "customer-support": `You are "Ava", Customer Support AI for RentAI 24.
ROLE: Customer service only — live chat, email, complaints, tickets, FAQs. Redirect non-support topics to appropriate agents.
TOOLS: create_ticket, list_tickets, update_ticket, close_ticket, email_customer, list_inbox, read_email, reply_email. ALWAYS create tickets for reported issues. Use inbox/email tools when asked about emails.
STYLE: Empathetic, concise, solution-oriented. Acknowledge concerns first. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "sales-sdr": `You are "Rex", Sales SDR AI for RentAI 24.
ROLE: Outbound sales and lead generation only — outreach, CRM, proposals, campaigns, meetings, pipeline analytics. Redirect non-sales topics.
TOOLS: send_email, add_lead, update_lead, list_leads, schedule_followup, create_meeting, bulk_email, use_template, start_drip_campaign, list_campaigns, list_templates, score_leads, pipeline_report, create_proposal, analyze_competitors, list_inbox, read_email, reply_email. Be proactive — add leads AND offer outreach when given prospect info.
STYLE: Persuasive, data-driven, value-focused. Confirm actions and suggest next steps. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "social-media": `You are "Maya", Social Media Manager AI for RentAI 24.
ROLE: Social media only — content, posts, visuals, hashtags, calendars, engagement. Redirect non-social topics.
TOOLS: generate_image (for AI visuals/graphics), find_stock_image (for stock photos), create_post, create_content_calendar, generate_hashtags, draft_response, list_connected_accounts. Always use tools to produce real content.
IMAGE CREDITS: Each image costs 1 credit. If blocked, direct user to buy credits via the 🪙 icon or Settings page.
SOCIAL ACCOUNTS: Use the list_connected_accounts tool to check which platforms the user has connected. If no accounts are connected, proactively suggest: "I noticed you haven't connected any social media accounts yet! To get the most out of my services, I recommend connecting your accounts in **Settings > Social Media Accounts**. I support Instagram, Twitter/X, LinkedIn, Facebook, TikTok, and YouTube. Once connected, I can create content tailored to your specific accounts and audiences!" When creating posts, reference the user's connected account usernames naturally.
STYLE: Creative, trend-aware, brand-conscious. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "bookkeeping": `You are "Finn", Bookkeeping AI for RentAI 24.
ROLE: Financial operations only — invoices, expenses, reporting, tax reminders, budgets. Not a certified accountant. Redirect non-financial topics.
TOOLS: create_invoice, log_expense, financial_summary. Always use tools for real invoices and expenses.
DISCLAIMER: "I provide bookkeeping assistance, not certified financial or tax advice. Consult a licensed accountant for official guidance."
STYLE: Precise, methodical, structured. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "scheduling": `You are "Cal", Scheduling AI for RentAI 24.
ROLE: Calendar and appointment management only — booking, reminders, rescheduling, availability. Redirect non-scheduling topics.
TOOLS: create_appointment (with calendar invites), list_appointments, send_reminder, schedule_followup_reminder, list_inbox, read_email, reply_email. Always confirm date, time, timezone, participants.
STYLE: Organized, proactive, efficient. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "hr-recruiting": `You are "Harper", HR & Recruiting AI for RentAI 24.
ROLE: Talent acquisition and HR operations only — job postings, resume screening, interviews, onboarding. Cannot make hiring decisions or give legal advice. Redirect non-HR topics.
TOOLS: create_job_posting, screen_resume, create_interview_kit, send_candidate_email. Always use tools for real deliverables.
DISCLAIMER: "I provide HR guidance, not legal employment advice. Consult an HR attorney for legal matters."
STYLE: Thorough, fair, objective, inclusive. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "data-analyst": `You are "DataBot", Data Analyst AI for RentAI 24.
ROLE: Data analysis and business intelligence only — reports, trends, KPIs, pipeline analytics. Redirect non-data topics.
TOOLS: query_leads, query_actions, query_campaigns, query_rentals, generate_report. ALWAYS query real data — never make up numbers.
STYLE: Analytical, precise, insight-driven. Structured formats with actual numbers. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "ecommerce-ops": `You are "ShopBot", E-Commerce Operations AI for RentAI 24.
ROLE: E-commerce operations only — product listings, pricing, reviews, marketplace optimization, shipping/cargo management. Redirect non-ecommerce topics.
TOOLS: optimize_listing, price_analysis, draft_review_response, list_shipping_providers. Always use tools for real content and analysis.
SHIPPING: If user has connected shipping providers, you can help with tracking, label generation guidance, and shipping cost calculations. If no provider is connected, suggest connecting one in Settings. Supported providers: Aras Kargo, Yurtiçi Kargo, MNG Kargo, Sürat Kargo, PTT Kargo, UPS, FedEx, DHL.
STYLE: Detail-oriented, conversion-focused, marketplace-savvy. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,

  "real-estate": `You are "Reno", Real Estate & Property AI for RentAI 24.
ROLE: Real estate operations only — property search, evaluations, neighborhoods, leases, market analysis, cost calculations. Not a licensed agent/attorney. Redirect non-real-estate topics.
TOOLS: search_properties, evaluate_listing, neighborhood_analysis, create_listing, lease_review, market_report, calculate_costs. Always use tools for real analysis.
SCAM FLAGS: Too-good-to-be-true pricing, wire transfer requests, no in-person viewings, pressure tactics.
DISCLAIMER: "I provide real estate guidance, not licensed advice. Consult a licensed agent or attorney for official transactions."
STYLE: Thorough, analytical, market-savvy. Focus on total cost of occupancy. Respond in user's language.
${BRAND_CONFIDENTIALITY}${ONBOARDING_GUIDANCE}`,
};

const defaultSystemPrompt = `You are a general assistant for RentAI 24, the world's first AI staffing agency. 
You can briefly introduce the available AI workers: Customer Support (Ava), Sales SDR (Rex), Social Media (Maya), Bookkeeping (Finn), Scheduling (Cal), HR & Recruiting (Harper), Data Analyst (DataBot), E-Commerce Ops (ShopBot), and Real Estate (Reno).
Suggest the user select a specific agent from the sidebar to get specialized help.
Respond in the same language the user writes in.
${BRAND_CONFIDENTIALITY}`;

const agentNameMap: Record<string, string> = {
  "customer-support": "Customer Support Agent",
  "sales-sdr": "Sales Development Rep",
  "social-media": "Social Media Manager",
  "bookkeeping": "Bookkeeping Assistant",
  "scheduling": "Appointment & Scheduling Agent",
  "hr-recruiting": "HR & Recruiting Assistant",
  "data-analyst": "Data Analyst Agent",
  "ecommerce-ops": "E-Commerce Operations Agent",
  "real-estate": "Real Estate & Property Agent",
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }

    const { username, email, password, fullName, company } = parsed.data;

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ error: "This username is already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      fullName,
      company: company || null,
    });

    req.session.userId = user.id;
    req.session.save(() => {
      res.json({
        user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, company: user.company, role: user.role },
      });
    });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const { email, password } = parsed.data;

    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({ error: "This account uses Google sign-in. Please sign in with Google instead." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).json({ error: "Session error" });
      }
      req.session.userId = user.id;
      req.session.save(() => {
        res.json({
          user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, company: user.company, role: user.role },
        });
      });
    });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to log out" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        company: user.company,
        role: user.role,
        hasSubscription: !!user.stripeSubscriptionId,
      },
    });
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          state: true,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email found in Google profile"));
            }

            let user = await storage.getUserByEmail(email);
            if (!user) {
              const username = email.split("@")[0] + "_" + Date.now().toString(36);
              user = await storage.createUser({
                username,
                email,
                password: null,
                fullName: profile.displayName || email.split("@")[0],
                company: null,
              });
            }
            return done(null, user);
          } catch (err) {
            return done(err as Error);
          }
        }
      )
    );

    passport.serializeUser((user, done) => done(null, (user as User).id));
    passport.deserializeUser(async (id: number, done) => {
      const user = await storage.getUserById(id);
      done(null, user || undefined);
    });

    app.get(
      "/api/auth/google",
      passport.authenticate("google", { scope: ["profile", "email"] })
    );

    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login" }),
      (req, res) => {
        const user = req.user as User;
        req.session.userId = user.id;
        req.session.save(() => {
          res.redirect("/dashboard");
        });
      }
    );
  }

  const profileUpdateSchema = z.object({
    fullName: z.string().transform(s => s.trim()).pipe(z.string().min(1, "Full name is required")),
    company: z.string().optional().transform(s => s?.trim() || null),
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const { fullName, company } = parsed.data;
    const updated = await storage.updateUserProfile(req.session.userId!, { fullName, company });
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        fullName: updated.fullName,
        company: updated.company,
        role: updated.role,
        hasSubscription: !!updated.stripeSubscriptionId,
      },
    });
  });

  const passwordUpdateSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  });

  app.patch("/api/auth/password", requireAuth, async (req, res) => {
    const parsed = passwordUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const { currentPassword, newPassword } = parsed.data;
    const user = await storage.getUserById(req.session.userId!);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.password) {
      return res.status(400).json({ error: "This account uses Google sign-in and has no password set. Please sign in with Google." });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await storage.updateUserPassword(req.session.userId!, hashedPassword);
    res.json({ success: true });
  });

  app.get("/api/email-status", requireAuth, async (req, res) => {
    try {
      const { getEmailStatus } = await import("./emailService");
      const userId = req.session.userId;
      const status = await getEmailStatus(userId);
      res.json(status);
    } catch {
      res.json({ provider: "platform", address: null, connected: true });
    }
  });

  app.get("/api/leads", requireAuth, async (req, res) => {
    const userLeads = await storage.getLeadsByUser(req.session.userId!);
    res.json(userLeads);
  });

  app.get("/api/agent-actions", requireAuth, async (req, res) => {
    const userActions = await storage.getActionsByUser(req.session.userId!);
    res.json(userActions);
  });

  app.get("/api/agent-tasks", requireAuth, async (req, res) => {
    const agentType = req.query.agentType as string | undefined;
    const tasks = await storage.getAgentTasksByUser(req.session.userId!, agentType);
    res.json(tasks);
  });

  app.post("/api/agent-tasks", requireAuth, async (req, res) => {
    const { title, description, agentType, priority, dueDate, project } = req.body;
    if (!title || !agentType) {
      return res.status(400).json({ error: "Title and agentType are required" });
    }
    const task = await storage.createAgentTask({
      userId: req.session.userId!,
      agentType,
      title,
      description: description || null,
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      project: project || null,
      status: "todo",
    });
    res.json(task);
  });

  app.patch("/api/agent-tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const updates: Record<string, unknown> = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.priority !== undefined) updates.priority = req.body.priority;
    if (req.body.project !== undefined) updates.project = req.body.project;
    if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
    const task = await storage.updateAgentTask(id, req.session.userId!, updates as any);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });

  app.delete("/api/agent-tasks/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteAgentTask(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ error: "Task not found" });
    res.json({ success: true });
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    const agentType = req.query.agentType as string;
    if (!agentType) return res.status(400).json({ error: "agentType is required" });
    const convos = await storage.getConversationsByUser(req.session.userId!, agentType);
    res.json(convos);
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    const { agentType, visibleId, title } = req.body;
    if (!agentType || !visibleId) return res.status(400).json({ error: "agentType and visibleId are required" });
    const convo = await storage.createConversation({
      visibleId,
      userId: req.session.userId!,
      agentType,
      title: title || "New Chat",
    });
    res.json(convo);
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" });
    const updated = await storage.updateConversationTitle(id, req.session.userId!, title);
    if (!updated) return res.status(404).json({ error: "Conversation not found" });
    res.json(updated);
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteConversation(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ error: "Conversation not found" });
    res.json({ success: true });
  });

  app.get("/api/conversations/:visibleId/messages", requireAuth, async (req, res) => {
    const { visibleId } = req.params;
    const messages = await storage.getConversationMessages(req.session.userId!, visibleId);
    res.json(messages);
  });

  app.get("/api/team-members", requireAuth, async (req, res) => {
    const members = await storage.getTeamMembers(req.session.userId!);
    res.json(members);
  });

  app.post("/api/team-members", requireAuth, async (req, res) => {
    const { name, email, position, department, skills, responsibilities, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
    const member = await storage.createTeamMember({
      userId: req.session.userId!,
      name,
      email,
      position: position || null,
      department: department || null,
      skills: skills || null,
      responsibilities: responsibilities || null,
      phone: phone || null,
    });
    res.json(member);
  });

  app.patch("/api/team-members/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid member ID" });
    const { name, email, position, department, skills, responsibilities, phone } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (position !== undefined) updates.position = position;
    if (department !== undefined) updates.department = department;
    if (skills !== undefined) updates.skills = skills;
    if (responsibilities !== undefined) updates.responsibilities = responsibilities;
    if (phone !== undefined) updates.phone = phone;
    const updated = await storage.updateTeamMember(id, req.session.userId!, updates);
    if (!updated) return res.status(404).json({ error: "Team member not found" });
    res.json(updated);
  });

  app.delete("/api/team-members/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid member ID" });
    const deleted = await storage.deleteTeamMember(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ error: "Team member not found" });
    res.json({ success: true });
  });

  app.get("/api/settings/gmail", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      gmailAddress: user.gmailAddress || null,
      hasOAuth: !!user.gmailRefreshToken,
      hasAppPassword: !!user.gmailAppPassword,
    });
  });

  app.get("/api/auth/google/url", requireAuth, async (req, res) => {
    try {
      const { generateGmailOAuthUrl } = await import("./googleOAuth");
      const { url, state } = generateGmailOAuthUrl();
      (req.session as any).gmailOAuthState = state;
      req.session.save(() => {
        res.json({ url });
      });
    } catch (err: any) {
      console.error("Google OAuth URL error:", err);
      res.status(500).json({ error: "Failed to generate Google auth URL" });
    }
  });

  app.get("/api/integrations/gmail/oauth/callback", async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect("/?gmail_error=missing_params");
    }
    try {
      const sessionState = (req.session as any).gmailOAuthState;
      if (!sessionState || sessionState !== String(state)) {
        return res.redirect("/?gmail_error=invalid_state");
      }
      const userId = req.session.userId;
      if (!userId) {
        return res.redirect("/?gmail_error=not_authenticated");
      }
      delete (req.session as any).gmailOAuthState;
      const { handleGoogleCallback } = await import("./googleOAuth");
      const result = await handleGoogleCallback(String(code), userId);
      res.redirect(`/?gmail_connected=${encodeURIComponent(result.email)}`);
    } catch (err: any) {
      console.error("Google OAuth callback error:", err);
      res.redirect(`/?gmail_error=${encodeURIComponent(err.message || "auth_failed")}`);
    }
  });

  app.delete("/api/settings/gmail", requireAuth, async (req, res) => {
    try {
      const { disconnectUserGmail } = await import("./googleOAuth");
      await disconnectUserGmail(req.session.userId!);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to disconnect Gmail" });
    }
  });

  app.get("/api/social-accounts", requireAuth, async (req, res) => {
    const accounts = await storage.getSocialAccounts(req.session.userId!);
    const sanitized = accounts.map(a => ({
      id: a.id,
      userId: a.userId,
      platform: a.platform,
      username: a.username,
      profileUrl: a.profileUrl,
      accountType: a.accountType,
      status: a.status,
      connectedAt: a.connectedAt,
      hasApiCredentials: !!(a.apiKey || a.accessToken),
    }));
    res.json(sanitized);
  });

  app.post("/api/social-accounts", requireAuth, async (req, res) => {
    const { platform, username, profileUrl, accessToken, accountType, apiKey, apiSecret, accessTokenSecret, pageId, businessAccountId } = req.body;
    if (!platform || !username) return res.status(400).json({ error: "Platform and username are required" });
    const validPlatforms = ["instagram", "twitter", "linkedin", "facebook", "tiktok", "youtube"];
    if (!validPlatforms.includes(platform)) return res.status(400).json({ error: "Invalid platform" });
    const account = await storage.addSocialAccount({
      userId: req.session.userId!,
      platform,
      username,
      profileUrl: profileUrl || null,
      accessToken: accessToken || null,
      accountType: accountType || "personal",
      apiKey: apiKey || null,
      apiSecret: apiSecret || null,
      accessTokenSecret: accessTokenSecret || null,
      pageId: pageId || null,
      businessAccountId: businessAccountId || null,
      status: "connected",
    });
    res.json({ id: account.id, userId: account.userId, platform: account.platform, username: account.username, profileUrl: account.profileUrl, accountType: account.accountType, status: account.status, connectedAt: account.connectedAt, hasApiCredentials: !!(account.apiKey || account.accessToken) });
  });

  app.patch("/api/social-accounts/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid account ID" });
    const { username, profileUrl, accessToken, status, accountType, apiKey, apiSecret, accessTokenSecret, pageId, businessAccountId } = req.body;
    const updates: any = {};
    if (username !== undefined) updates.username = username;
    if (profileUrl !== undefined) updates.profileUrl = profileUrl;
    if (accessToken !== undefined) updates.accessToken = accessToken;
    if (status !== undefined) updates.status = status;
    if (accountType !== undefined) updates.accountType = accountType;
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (apiSecret !== undefined) updates.apiSecret = apiSecret;
    if (accessTokenSecret !== undefined) updates.accessTokenSecret = accessTokenSecret;
    if (pageId !== undefined) updates.pageId = pageId;
    if (businessAccountId !== undefined) updates.businessAccountId = businessAccountId;
    const updated = await storage.updateSocialAccount(id, req.session.userId!, updates);
    if (!updated) return res.status(404).json({ error: "Account not found" });
    res.json({ id: updated.id, userId: updated.userId, platform: updated.platform, username: updated.username, profileUrl: updated.profileUrl, accountType: updated.accountType, status: updated.status, connectedAt: updated.connectedAt, hasApiCredentials: !!(updated.apiKey || updated.accessToken) });
  });

  app.delete("/api/social-accounts/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid account ID" });
    const deleted = await storage.deleteSocialAccount(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ error: "Account not found" });
    res.json({ success: true });
  });

  app.get("/api/scheduled-posts", requireAuth, async (req, res) => {
    const posts = await storage.getScheduledPosts(req.session.userId!);
    res.json(posts);
  });

  app.post("/api/scheduled-posts/:id/cancel", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid post ID" });
    const cancelled = await storage.cancelScheduledPost(id, req.session.userId!);
    if (!cancelled) return res.status(404).json({ error: "Post not found or already published/cancelled" });
    res.json({ success: true });
  });

  app.get("/api/shipping-providers", requireAuth, async (req, res) => {
    const providers = await storage.getShippingProviders(req.session.userId!);
    const sanitized = providers.map(p => ({
      id: p.id,
      userId: p.userId,
      provider: p.provider,
      apiKey: p.apiKey ? `****${p.apiKey.slice(-4)}` : "",
      hasPassword: !!p.password,
      hasCustomerCode: !!p.customerCode,
      hasUsername: !!p.username,
      hasAccountNumber: !!p.accountNumber,
      hasSiteId: !!p.siteId,
      status: p.status,
      createdAt: p.createdAt,
    }));
    res.json(sanitized);
  });

  app.post("/api/shipping-providers", requireAuth, async (req, res) => {
    const { provider, apiKey, customerCode, username, password, accountNumber, siteId } = req.body;
    if (!provider || !apiKey) return res.status(400).json({ error: "Provider and API key are required" });
    const validProviders = ["aras", "yurtici", "mng", "surat", "ptt", "ups", "fedex", "dhl"];
    if (!validProviders.includes(provider)) return res.status(400).json({ error: "Invalid shipping provider" });
    const created = await storage.addShippingProvider({
      userId: req.session.userId!,
      provider,
      apiKey,
      customerCode: customerCode || null,
      username: username || null,
      password: password || null,
      accountNumber: accountNumber || null,
      siteId: siteId || null,
      status: "active",
    });
    res.json(created);
  });

  app.patch("/api/shipping-providers/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid provider ID" });
    const { apiKey, customerCode, username, password, accountNumber, siteId, status } = req.body;
    const updates: any = {};
    if (apiKey !== undefined) updates.apiKey = apiKey;
    if (customerCode !== undefined) updates.customerCode = customerCode;
    if (username !== undefined) updates.username = username;
    if (password !== undefined) updates.password = password;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber;
    if (siteId !== undefined) updates.siteId = siteId;
    if (status !== undefined) updates.status = status;
    const updated = await storage.updateShippingProvider(id, req.session.userId!, updates);
    if (!updated) return res.status(404).json({ error: "Provider not found" });
    res.json(updated);
  });

  app.delete("/api/shipping-providers/:id", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid provider ID" });
    const deleted = await storage.deleteShippingProvider(id, req.session.userId!);
    if (!deleted) return res.status(404).json({ error: "Provider not found" });
    res.json({ success: true });
  });

  app.get("/api/boss/notifications", requireAuth, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const notifications = await storage.getBossNotifications(req.session.userId!, limit);
    res.json(notifications);
  });

  app.get("/api/support-tickets", requireAuth, async (req, res) => {
    const tickets = await storage.getTicketsByUser(req.session.userId!);
    res.json(tickets);
  });

  app.post("/api/support-tickets", requireAuth, async (req, res) => {
    const { subject, description, category, agentType, priority } = req.body;
    if (!subject?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "Subject and description are required" });
    }
    const ticket = await storage.createSupportTicket({
      userId: req.session.userId!,
      subject: subject.trim(),
      description: description.trim(),
      category: category || "general",
      agentType: agentType || null,
      priority: priority || "medium",
      customerEmail: null,
    });
    res.json(ticket);
  });

  app.get("/api/admin/support-tickets", requireAdmin, async (_req, res) => {
    const tickets = await storage.getAllTickets();
    res.json(tickets);
  });

  app.patch("/api/admin/support-tickets/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, priority, resolution, adminReply } = req.body;
    const updated = await storage.adminUpdateTicket(id, { status, priority, resolution, adminReply });
    if (!updated) return res.status(404).json({ error: "Ticket not found" });
    res.json(updated);
  });

  app.get("/api/admin/guardrail-logs", requireAdmin, async (req, res) => {
    const { agentType, ruleType, limit } = req.query;
    const logs = await storage.getGuardrailLogs({
      agentType: agentType as string | undefined,
      ruleType: ruleType as string | undefined,
      limit: limit ? parseInt(limit as string) : 100,
    });
    res.json(logs);
  });

  app.get("/api/campaigns", requireAuth, async (req, res) => {
    const campaigns = await storage.getCampaignsByUser(req.session.userId!);
    res.json(campaigns);
  });

  app.get("/api/smart-alerts", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const leads = await storage.getLeadsByUser(userId);
    const alerts: Array<{ type: string; severity: string; message: string; leadId?: number }> = [];

    const now = Date.now();
    for (const lead of leads) {
      const daysSinceUpdate = Math.floor((now - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24));

      if (lead.status === "new" && daysSinceUpdate >= 3) {
        alerts.push({ type: "stale_new", severity: "warning", message: `${lead.name} has been "new" for ${daysSinceUpdate} days — send initial outreach!`, leadId: lead.id });
      }

      if (lead.status === "contacted" && daysSinceUpdate >= 7) {
        alerts.push({ type: "stale_contacted", severity: "warning", message: `${lead.name} was contacted ${daysSinceUpdate} days ago — follow up!`, leadId: lead.id });
      }

      if (lead.status === "qualified" && daysSinceUpdate >= 5) {
        alerts.push({ type: "qualified_waiting", severity: "info", message: `${lead.name} is qualified but hasn't moved in ${daysSinceUpdate} days — send a proposal!`, leadId: lead.id });
      }

      if (lead.status === "proposal" && daysSinceUpdate >= 10) {
        alerts.push({ type: "proposal_stale", severity: "urgent", message: `${lead.name}'s proposal has been pending for ${daysSinceUpdate} days — check in!`, leadId: lead.id });
      }

      if (lead.score === "hot" && lead.status !== "won" && lead.status !== "lost") {
        alerts.push({ type: "hot_lead", severity: "success", message: `${lead.name} is a HOT lead — prioritize closing!`, leadId: lead.id });
      }
    }

    const newThisWeek = leads.filter(l => (now - new Date(l.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000).length;
    if (newThisWeek > 0) {
      alerts.push({ type: "weekly_summary", severity: "info", message: `${newThisWeek} new lead${newThisWeek > 1 ? "s" : ""} added this week` });
    }

    res.json(alerts);
  });

  app.get("/api/rentals", requireAuth, async (req, res) => {
    const rentals = await storage.getRentalsByUser(req.session.userId!);
    const enriched = rentals.map((r) => ({
      ...r,
      agentName: agentNameMap[r.agentType] || r.agentType,
    }));
    res.json(enriched);
  });

  app.post("/api/rentals", requireAuth, async (req, res) => {
    const { agentType } = req.body;
    if (!agentType || !agentNameMap[agentType]) {
      return res.status(400).json({ error: "Invalid agent type" });
    }

    const user = await storage.getUserById(req.session.userId!);
    if (!user?.stripeSubscriptionId) {
      return res.status(403).json({ error: "An active subscription is required. Please subscribe from the Pricing page first." });
    }

    const existing = await storage.getActiveRental(req.session.userId!, agentType);
    if (existing) {
      return res.status(409).json({ error: "You already have an active rental for this agent" });
    }

    const subscription = await storage.getSubscription(user.stripeSubscriptionId);
    if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
      return res.status(403).json({ error: "Your subscription is not active. Please update your billing." });
    }

    const planMeta = subscription.metadata?.plan || 'starter';
    const planLimits: Record<string, number> = { starter: 100, professional: 500, enterprise: 5000 };

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const rental = await storage.createRental({
      userId: req.session.userId!,
      agentType,
      plan: planMeta,
      status: "active",
      messagesLimit: planLimits[planMeta] || 100,
      expiresAt,
    });

    res.json({ ...rental, agentName: agentNameMap[agentType] });
  });

  app.get("/api/images/:filename", (req, res) => {
    const filepath = getImagePath(req.params.filename);
    if (!filepath) {
      return res.status(404).json({ error: "Image not found" });
    }
    const ext = path.extname(req.params.filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.sendFile(filepath);
  });

  app.get("/api/images/:filename/download", (req, res) => {
    const filepath = getImagePath(req.params.filename);
    if (!filepath) {
      return res.status(404).json({ error: "Image not found" });
    }
    const ext = path.extname(req.params.filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${req.params.filename}"`);
    res.sendFile(filepath);
  });

  const chatUploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, chatImageDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const chatUpload = multer({
    storage: chatUploadStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed (JPG, PNG, GIF, WebP, SVG)"));
      }
    },
  });

  app.post("/api/chat/upload", requireAuth, chatUpload.single("image"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    const imageUrl = `/api/chat/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl, filename: req.file.originalname });
  });

  app.get("/api/chat/uploads/:filename", (req, res) => {
    const filepath = path.join(chatImageDir, req.params.filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.sendFile(filepath);
  });

  app.post("/api/chat", async (req, res) => {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { message, agentType, conversationHistory, sessionId: clientSessionId } = parsed.data;

    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const guardrailResult = await checkInput(message, agentType, req.session.userId || null, clientIp);
    if (!guardrailResult.allowed) {
      logGuardrailBlock(
        req.session.userId || null,
        agentType,
        guardrailResult.ruleType || "unknown",
        guardrailResult.reason || "Blocked",
        message
      );
      return res.status(403).json({
        reply: guardrailResult.reason,
        code: "GUARDRAIL_BLOCKED",
      });
    }

    let systemPrompt = agentSystemPrompts[agentType] || defaultSystemPrompt;

    let userName: string | null = null;
    let userCompany: string | null = null;
    let teamMembersContext = "";
    if (req.session.userId) {
      const currentUser = await storage.getUserById(req.session.userId);
      if (currentUser) {
        userName = currentUser.fullName || currentUser.username;
        userCompany = currentUser.company || null;
      }
      const members = await storage.getTeamMembers(req.session.userId);
      if (members.length > 0) {
        teamMembersContext = `\n\nTEAM MEMBERS (the user's organization):
${members.map(m => `- ${m.name} (${m.email})${m.position ? ` — ${m.position}` : ""}${m.department ? `, ${m.department}` : ""}${m.skills ? ` | Skills: ${m.skills}` : ""}${m.responsibilities ? ` | Responsibilities: ${m.responsibilities}` : ""}`).join("\n")}
- You know these team members and can reference them when relevant.
- When sending emails or coordinating tasks, consider involving the right team member based on their role and skills.`;
      }
    }

    const personalizationBlock = userName
      ? `\n\nPERSONALIZATION:
- The user's name is "${userName}".${userCompany ? ` They work at "${userCompany}".` : ""}
- Address them by their first name naturally in conversation (e.g., "Hi ${userName.split(" ")[0]}!", "Sure ${userName.split(" ")[0]},").
- Make interactions personal and warm — they are a valued client.
- Remember their name throughout the conversation.`
      : (!conversationHistory || conversationHistory.length === 0)
        ? `\n\nPERSONALIZATION:
- You don't know this user's name yet.
- At the START of the very first message, warmly introduce yourself and ask for their name before helping.
- For example: "Hi! I'm [your persona name]. Before we get started, may I know your name?"
- Once they tell you their name, use it naturally throughout the conversation.`
        : `\n\nPERSONALIZATION:
- If the user has already told you their name in this conversation, keep using it naturally.
- If not, feel free to ask when appropriate.`;

    systemPrompt += personalizationBlock;
    systemPrompt += teamMembersContext;

    if (agentType === "social-media" && req.session.userId) {
      const socialAccountsList = await storage.getSocialAccounts(req.session.userId);
      if (socialAccountsList.length > 0) {
        const accountsStr = socialAccountsList.map(a => {
          const typeLabel = a.accountType === "business" ? "🔗 API/Business" : "👤 Personal";
          const canAutoPost = a.accountType === "business";
          return `- ${a.platform.charAt(0).toUpperCase() + a.platform.slice(1)}: @${a.username} [${typeLabel}] ${canAutoPost ? "(auto-publish ready)" : "(manual sharing only)"}`;
        }).join("\n");
        systemPrompt += `\n\nCONNECTED SOCIAL ACCOUNTS:\n${accountsStr}\n\nPOSTING RULES:\n- For "API/Business" accounts: Use publish_post to auto-publish directly via API.\n- For "Personal" accounts: Use prepare_post_for_manual_sharing to create a Publish Assistant card. Do NOT attempt publish_post for personal accounts.\n- Always check account type before choosing the posting method.\n- When user says "paylaş" / "share" / "post this": Check the target platform's account type and use the correct tool.\n- You can schedule future posts for any account type using schedule_post.`;
      } else {
        systemPrompt += `\n\nSOCIAL ACCOUNTS STATUS: No accounts connected yet. On first interaction, suggest the user connect their social media accounts in Settings > Social Media Accounts for a more personalized experience. They can choose between Personal accounts (manual sharing with Publish Assistant) or Business/API accounts (auto-publishing via API).`;
      }
    }

    if (agentType === "ecommerce-ops" && req.session.userId) {
      const providerNames: Record<string, string> = {
        aras: "Aras Kargo", yurtici: "Yurtici Kargo", mng: "MNG Kargo",
        surat: "Surat Kargo", ptt: "PTT Kargo", ups: "UPS", fedex: "FedEx", dhl: "DHL"
      };
      const shippingList = await storage.getShippingProviders(req.session.userId);
      if (shippingList.length > 0) {
        const providersStr = shippingList.map(p =>
          `- ${providerNames[p.provider] || p.provider} (${p.status})`
        ).join("\n");
        systemPrompt += `\n\nCONNECTED SHIPPING PROVIDERS:\n${providersStr}\n- User has cargo integrations set up. Help with tracking, shipping cost calculations, and logistics optimization.`;
      } else {
        systemPrompt += `\n\nSHIPPING STATUS: No shipping/cargo providers connected yet. On first interaction, suggest the user connect their shipping provider API in Settings > Shipping Providers for cargo tracking and logistics support. Supported: Aras Kargo, Yurtici Kargo, MNG Kargo, Surat Kargo, PTT Kargo, UPS, FedEx, DHL.`;
      }
    }

    const TOKEN_SPENDING_LIMIT_USD = 5.00;

    let hasActiveRental = false;
    let isLoggedIn = !!req.session.userId;

    if (req.session.userId) {
      const userRentals = await storage.getRentalsByUser(req.session.userId);
      const activeRentals = userRentals.filter(r => r.status === "active");

      if (activeRentals.length > 0) {
        const rental = activeRentals.find(r => r.agentType === agentType);
        if (!rental) {
          return res.status(403).json({
            reply: "Bu ajana erişiminiz yok. Lütfen Workers sayfasından kiralayın.",
          });
        }
        if (rental.messagesUsed >= rental.messagesLimit) {
          return res.status(403).json({
            reply: "Bu ajan için mesaj limitinize ulaştınız. Daha fazla mesaj için planınızı yükseltin.",
          });
        }
        const userSpending = await storage.getTokenSpending(req.session.userId, agentType);
        if (userSpending >= TOKEN_SPENDING_LIMIT_USD) {
          return res.status(403).json({
            reply: `Bu ajan için token harcama limitinize ($${TOKEN_SPENDING_LIMIT_USD.toFixed(2)} USD) ulaştınız. Şu ana kadar $${userSpending.toFixed(4)} harcandı. Daha fazla kullanım için lütfen planınızı yükseltin.`,
            limitReached: true,
            spent: userSpending,
            limit: TOKEN_SPENDING_LIMIT_USD,
          });
        }
        hasActiveRental = true;
        await storage.incrementUsage(rental.id);
      } else {
        const userSpending = await storage.getTokenSpending(req.session.userId);
        if (userSpending >= TOKEN_SPENDING_LIMIT_USD) {
          return res.status(403).json({
            reply: `Demo token harcama limitine ($${TOKEN_SPENDING_LIMIT_USD.toFixed(2)} USD) ulaştınız. Devam etmek için bir ajan kiralayın.`,
            limitReached: true,
            spent: userSpending,
            limit: TOKEN_SPENDING_LIMIT_USD,
          });
        }
      }
    } else {
      const sessionSpending = (req.session as any).tokenSpending || 0;
      if (sessionSpending >= TOKEN_SPENDING_LIMIT_USD) {
        return res.status(403).json({
          reply: `Demo token harcama limitine ($${TOKEN_SPENDING_LIMIT_USD.toFixed(2)} USD) ulaşıldı. Devam etmek için lütfen kayıt olun ve bir ajan kiralayın.`,
          limitReached: true,
          spent: sessionSpending,
          limit: TOKEN_SPENDING_LIMIT_USD,
        });
      }
    }

    if (!hasActiveRental) {
      const demoCapabilities: Record<string, string> = {
        "customer-support": "live chat support, email responses, complaint handling, ticket management, FAQ handling, order tracking, refund processing",
        "sales-sdr": "lead management, pipeline tracking, email outreach, follow-up scheduling, drip campaigns, proposal creation, competitor analysis",
        "social-media": "social media content creation, post scheduling, content calendars, hashtag generation, AI image generation, platform-specific content",
        "bookkeeping": "invoice creation, expense logging, financial summaries & reports, budget tracking",
        "scheduling": "appointment scheduling, meeting management, reminders, calendar coordination",
        "hr-recruiting": "job posting creation, resume screening, interview preparation, candidate communication",
        "data-analyst": "data queries, report generation, lead/campaign/rental analytics, performance insights",
        "ecommerce-ops": "product listing optimization, price analysis, review response drafting, SEO, shipping/cargo provider integration and tracking",
        "real-estate": "property search, listing evaluation, neighborhood analysis, lease review, market reports",
      };
      const caps = demoCapabilities[agentType] || "various business tasks";
      systemPrompt += `\n\nDEMO MODE RULES (STRICTLY FOLLOW):
- You are in DEMO mode. You CANNOT perform any real actions or use any tools.
- Keep responses SHORT (2-4 sentences max).
- On the FIRST message: Briefly introduce yourself, list your key capabilities as bullet points, then say: "To unlock my full capabilities, create an account and rent me from the Workers page!"
- Your capabilities: ${caps}
- If the user asks you to do something (send email, create content, etc.), say: "I can do that! But first you need to create an account and rent me. Once activated, I can handle ${caps}."
- NEVER pretend to perform actions. NEVER simulate results. Just describe what you COULD do.
- Always end with a call-to-action to get started / create an account.
- Do NOT have long conversations. After 2-3 exchanges, remind them to create an account to continue.`;
    }

    try {
      const ragChunks = await retrieveRelevantChunks(agentType, message, 3).catch(() => []);
      if (ragChunks.length > 0) {
        const context = ragChunks.join("\n\n---\n\n");
        systemPrompt += `\n\n## KNOWLEDGE BASE\n${context}`;
      }

      let modelToUse = "gpt-4o";
      let useDirectClient = false;
      const fineTunedModel = await getActiveModel(agentType).catch(() => null);
      if (fineTunedModel) {
        modelToUse = fineTunedModel;
        useDirectClient = true;
      }

      let chatClient = openai;
      if (useDirectClient && process.env.OPENAI_API_KEY) {
        chatClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }

      const agentTools = hasActiveRental ? getRelevantToolsForMessage(agentType, message) : undefined;
      const isAgenticAgent = !!agentTools;

      if (!fineTunedModel) {
        modelToUse = routeModel(message, !!agentTools);
      }

      const chatSessionId = clientSessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      if (conversationHistory && conversationHistory.length > 0) {
        const processedHistory = await summarizeConversationHistory(
          conversationHistory,
          chatSessionId,
          chatClient,
          req.session.userId,
          agentType
        );
        messages.push(...processedHistory);
      }

      messages.push({ role: "user", content: message });

      const response = await chatClient.chat.completions.create({
        model: modelToUse,
        messages,
        max_tokens: 800,
        temperature: 0.7,
        ...(agentTools ? { tools: agentTools } : {}),
      });

      let totalPromptTokens = response.usage?.prompt_tokens || 0;
      let totalCompletionTokens = response.usage?.completion_tokens || 0;
      let operationType = "chat";

      let assistantMessage = response.choices[0]?.message;
      const actions: Array<{ type: string; description: string }> = [];

      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0 && hasActiveRental) {
        operationType = "tool_call";
        messages.push(assistantMessage);

        const executedToolSignatures = new Set<string>();

        for (const toolCall of assistantMessage.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);

          const toolSignature = `${toolCall.function.name}:${JSON.stringify(args, Object.keys(args).sort())}`;
          if (executedToolSignatures.has(toolSignature)) {
            const toolMessage: OpenAI.ChatCompletionToolMessageParam = {
              role: "tool",
              tool_call_id: toolCall.id,
              content: `[Skipped] This exact action (${toolCall.function.name}) was already executed with the same parameters in this request. See the previous result above.`,
            };
            messages.push(toolMessage);
            actions.push({ type: "tool_dedup", description: `⏭️ Skipped duplicate ${toolCall.function.name} call` });
            if (req.session.userId) {
              await storage.createAgentAction({
                userId: req.session.userId,
                agentType,
                actionType: "tool_dedup",
                description: `Skipped duplicate ${toolCall.function.name} call`,
                metadata: { toolName: toolCall.function.name, args },
              });
            }
            continue;
          }
          executedToolSignatures.add(toolSignature);

          const toolResult = await executeToolCall(
            toolCall.function.name,
            args,
            req.session.userId,
            agentType
          );

          const toolMessage: OpenAI.ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult.result,
          };
          messages.push(toolMessage);

          if (toolResult.actionType && toolResult.actionDescription) {
            actions.push({ type: toolResult.actionType, description: toolResult.actionDescription });
          }
        }

        const followUp = await chatClient.chat.completions.create({
          model: modelToUse,
          messages,
          max_tokens: 800,
          temperature: 0.7,
        });

        totalPromptTokens += followUp.usage?.prompt_tokens || 0;
        totalCompletionTokens += followUp.usage?.completion_tokens || 0;
        assistantMessage = followUp.choices[0]?.message;
      }

      const totalTokens = totalPromptTokens + totalCompletionTokens;
      const costUsd = calculateTokenCost(modelToUse, totalPromptTokens, totalCompletionTokens);

      if (!req.session.userId) {
        (req.session as any).tokenSpending = ((req.session as any).tokenSpending || 0) + costUsd;
      }

      storage.logTokenUsage({
        userId: req.session.userId || null,
        agentType,
        model: modelToUse,
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens,
        costUsd: costUsd.toFixed(6),
        operationType,
      }).catch(err => console.error("Token usage log error:", err.message));

      const rawReply = assistantMessage?.content || "Sorry, I couldn't generate a response. Please try again.";
      const reply = sanitizeOutput(rawReply, agentType);

      const usedTool = operationType === "tool_call";

      storage.saveChatMessage({
        userId: req.session.userId || null,
        agentType,
        sessionId: chatSessionId,
        role: "user",
        content: message,
        usedTool: false,
      }).catch(err => console.error("Chat message save error:", err.message));

      storage.saveChatMessage({
        userId: req.session.userId || null,
        agentType,
        sessionId: chatSessionId,
        role: "assistant",
        content: reply,
        usedTool,
      }).catch(err => console.error("Chat message save error:", err.message));

      res.json({ reply, actions: actions.length > 0 ? actions : undefined, sessionId: chatSessionId });
    } catch (error: any) {
      console.error("Chat API error:", error?.message || error);
      res.status(502).json({
        reply: "I'm having trouble connecting right now. Please try again in a moment.",
      });
    }
  });

  app.post("/api/contact", async (req, res) => {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check your form data", details: parsed.error.flatten() });
    }

    try {
      await storage.createContactMessage({
        name: parsed.data.name,
        email: parsed.data.email,
        company: parsed.data.company,
        companySize: parsed.data.companySize,
        aiWorkerInterest: parsed.data.aiWorkerInterest || null,
        message: parsed.data.message,
      });
      res.json({ success: true, message: "Your message has been received. We'll get back to you within 2 hours." });
    } catch (error: any) {
      console.error("Contact form error:", error.message);
      res.status(500).json({ error: "Failed to save your message. Please try again." });
    }
  });

  app.post("/api/newsletter", async (req, res) => {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    try {
      await storage.createNewsletterSubscriber(parsed.data.email);
      res.json({ success: true, message: "You've been subscribed to our newsletter!" });
    } catch (error: any) {
      if (error.message?.includes("unique") || error.code === "23505") {
        return res.json({ success: true, message: "You're already subscribed!" });
      }
      console.error("Newsletter error:", error.message);
      res.status(500).json({ error: "Failed to subscribe. Please try again." });
    }
  });

  app.get("/api/stripe/config", (_req, res) => {
    try {
      const publishableKey = getPublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const rows = await storage.listProductsWithPrices();
      const productsMap = new Map();
      for (const row of rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            active: row.product_active,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            active: row.price_active,
            metadata: row.price_metadata,
          });
        }
      }
      res.json({ data: Array.from(productsMap.values()) });
    } catch (error: any) {
      console.error("Error fetching stripe products:", error.message);
      res.json({ data: [] });
    }
  });

  app.post("/api/test-checkout", requireAuth, async (req, res) => {
    try {
      const { plan, agentType, cardNumber, expiry, cvc } = req.body;

      const allowedPlans = ["starter", "professional"];
      if (!plan || !allowedPlans.includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const cleanCard = (cardNumber || "").replace(/\s/g, "");
      const validTestCards = [
        "4242424242424242",
        "4000000000000077",
        "5555555555554444",
        "378282246310005",
      ];
      const declinedCards = [
        "4000000000000002",
        "4000000000009995",
        "4000000000000069",
      ];

      if (declinedCards.includes(cleanCard)) {
        return res.status(402).json({ error: "Card declined. Please try a different card." });
      }

      if (!validTestCards.includes(cleanCard)) {
        return res.status(400).json({ error: "Invalid test card number. Use 4242 4242 4242 4242 for testing." });
      }

      if (!expiry || !cvc) {
        return res.status(400).json({ error: "Card details are incomplete" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const planLimits: Record<string, number> = { starter: 100, professional: 500 };
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      if (agentType && agentNameMap[agentType]) {
        const existing = await storage.getActiveRental(user.id, agentType);
        if (existing) {
          return res.status(409).json({ error: "You already have an active rental for this agent" });
        }

        await storage.createRental({
          userId: user.id,
          agentType,
          plan,
          status: "active",
          messagesLimit: planLimits[plan] || 100,
          expiresAt,
        });
      } else {
        const defaultAgent = "customer-support";
        const existing = await storage.getActiveRental(user.id, defaultAgent);
        if (!existing) {
          await storage.createRental({
            userId: user.id,
            agentType: defaultAgent,
            plan,
            status: "active",
            messagesLimit: planLimits[plan] || 100,
            expiresAt,
          });
        }
      }

      await storage.updateUserStripeInfo(user.id, {
        stripeSubscriptionId: `test_sub_${Date.now()}`,
      });

      res.json({ success: true, redirect: "/dashboard?checkout=success" });
    } catch (error: any) {
      console.error("Test checkout error:", error.message);
      res.status(500).json({ error: "Checkout failed. Please try again." });
    }
  });

  app.post("/api/stripe/checkout", requireAuth, async (req, res) => {
    try {
      const { priceId, agentType } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const price = await storage.getPrice(priceId);
      if (!price || !price.active || !price.recurring) {
        return res.status(400).json({ error: "Invalid or inactive price" });
      }

      const product = await storage.getProduct(price.product);
      if (!product || !product.active) {
        return res.status(400).json({ error: "Invalid product" });
      }

      const allowedPlans = ["starter", "professional"];
      const planMeta = product.metadata?.plan;
      if (!planMeta || !allowedPlans.includes(planMeta)) {
        return res.status(400).json({ error: "Invalid plan. Enterprise plans require contacting sales." });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/dashboard?checkout=success`,
        `${baseUrl}/pricing?checkout=cancelled`,
        agentType ? { agentType, plan: planMeta } : { plan: planMeta }
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Checkout error:", error.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/checkout/credits", requireAuth, async (req, res) => {
    try {
      const { priceId } = req.body;
      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const price = await storage.getPrice(priceId);
      if (!price || !price.active) {
        return res.status(400).json({ error: "Invalid or inactive price" });
      }

      const product = await storage.getProduct(price.product);
      if (!product || !product.active || product.metadata?.type !== "image_credits") {
        return res.status(400).json({ error: "Invalid image credit product" });
      }

      const credits = parseInt(price.metadata?.credits || "0");
      if (credits <= 0) {
        return res.status(400).json({ error: "Invalid credit amount" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        await storage.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createOneTimeCheckout(
        customerId,
        priceId,
        1,
        `${baseUrl}/demo?credits=purchased`,
        `${baseUrl}/demo?credits=cancelled`,
        { type: "image_credits", credits: String(credits) }
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Credits checkout error:", error.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/image-credits", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "User not found" });
      res.json({ credits: user.imageCredits });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/test-checkout/credits", requireAuth, async (req, res) => {
    try {
      const { packageId, cardNumber, expiry, cvc } = req.body;
      if (!packageId || !cardNumber || !expiry || !cvc) {
        return res.status(400).json({ error: "All payment fields are required" });
      }

      const validCards = ["4242424242424242", "4000000000000077", "5555555555554444", "378282246310005"];
      const cleanCard = cardNumber.replace(/\s/g, "");
      if (!validCards.includes(cleanCard)) {
        return res.status(400).json({ error: "Invalid test card number. Use: 4242 4242 4242 4242" });
      }

      const packages: Record<string, { credits: number; price: number; label: string }> = {
        "credits-5": { credits: 5, price: 10, label: "5 Credits" },
        "credits-15": { credits: 15, price: 25, label: "15 Credits" },
        "credits-50": { credits: 50, price: 70, label: "50 Credits" },
      };

      const pkg = packages[packageId];
      if (!pkg) {
        return res.status(400).json({ error: "Invalid credit package" });
      }

      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "User not found" });

      const currentCredits = user.imageCredits || 0;
      await storage.addImageCredits(req.session.userId!, pkg.credits);
      const newCredits = currentCredits + pkg.credits;

      res.json({ 
        success: true, 
        credits: newCredits, 
        purchased: pkg.credits,
        message: `${pkg.label} purchased successfully! You now have ${newCredits} credits.`
      });
    } catch (error: any) {
      console.error("Credit purchase error:", error.message);
      res.status(500).json({ error: "Failed to purchase credits" });
    }
  });

  app.get("/api/image-credits/prices", async (_req, res) => {
    res.json([
      { id: "credits-5", credits: 5, amount: 1000, currency: "usd" },
      { id: "credits-15", credits: 15, amount: 2500, currency: "usd" },
      { id: "credits-50", credits: 50, amount: 7000, currency: "usd" },
    ]);
  });

  // Legacy Stripe-based price endpoint (unused)
  app.get("/api/image-credits/prices-legacy", async (_req, res) => {
    try {
      const rows = await storage.listProductsWithPrices(true);
      const prices = rows
        .filter((r: any) => {
          const meta = typeof r.product_metadata === 'string' ? JSON.parse(r.product_metadata) : r.product_metadata;
          return meta?.type === "image_credits" && r.price_id;
        })
        .map((r: any) => {
          const priceMeta = typeof r.price_metadata === 'string' ? JSON.parse(r.price_metadata) : r.price_metadata;
          return {
            id: r.price_id,
            credits: parseInt(priceMeta?.credits || "0"),
            amount: r.unit_amount,
            currency: r.currency,
          };
        })
        .filter((p: any) => p.credits > 0)
        .sort((a: any, b: any) => a.credits - b.credits);
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/stripe/portal", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing account found" });
      }

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
      const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get('host')}`;
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/dashboard`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error.message);
      res.status(500).json({ error: "Failed to open billing portal" });
    }
  });

  app.get("/api/stripe/subscription", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user?.stripeSubscriptionId) {
        return res.json({ subscription: null });
      }
      const subscription = await storage.getSubscription(user.stripeSubscriptionId);
      res.json({ subscription });
    } catch (error: any) {
      console.error("Subscription error:", error.message);
      res.json({ subscription: null });
    }
  });

  const adminTokens = new Set<string>();

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(503).json({ error: "Admin access not configured" });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Admin authentication required" });
    }
    const token = authHeader.slice(7);
    if (!adminTokens.has(token)) {
      return res.status(403).json({ error: "Invalid admin credentials" });
    }
    next();
  }

  app.post("/api/admin/auth", (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(503).json({ error: "Admin access not configured" });
    }
    if (password !== adminPassword) {
      return res.status(403).json({ error: "Invalid admin password" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    adminTokens.add(token);
    res.json({ success: true, token });
  });

  app.get("/api/admin/agents/:agentType/documents", requireAdmin, async (req, res) => {
    try {
      const docs = await getDocumentsByAgent(req.params.agentType);
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/agents/:agentType/documents", requireAdmin, (req, res, next) => {
    uploadDocument.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const doc = await processAndStoreDocument(
          req.file.path,
          req.file.originalname,
          req.params.agentType,
          req.file.mimetype,
          req.file.size
        );
        res.json(doc);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  app.post("/api/admin/agents/:agentType/documents/url", requireAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URL is required" });
      }
      const doc = await processAndStoreUrl(url, req.params.agentType);
      res.json(doc);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/documents/:docId", requireAdmin, async (req, res) => {
    try {
      await deleteDocument(parseInt(req.params.docId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/agents/:agentType/fine-tuning", requireAdmin, async (req, res) => {
    try {
      const jobs = await getJobsByAgent(req.params.agentType);
      res.json(jobs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/agents/:agentType/fine-tuning", requireAdmin, (req, res, next) => {
    uploadTrainingFile.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        const job = await createFineTuningJob(
          req.params.agentType,
          req.file.path,
          req.file.originalname
        );
        res.json(job);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  app.post("/api/admin/fine-tuning/:jobId/sync", requireAdmin, async (req, res) => {
    try {
      const job = await syncJobStatus(parseInt(req.params.jobId));
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/fine-tuning/:jobId/activate", requireAdmin, async (req, res) => {
    try {
      const { agentType } = req.body;
      if (!agentType) {
        return res.status(400).json({ error: "agentType is required" });
      }
      const job = await toggleActiveModel(parseInt(req.params.jobId), agentType);
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/agents/:agentType/fine-tuning/deactivate", requireAdmin, async (req, res) => {
    try {
      await deactivateModel(req.params.agentType);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/agent-rules-pdf", requireAdmin, async (_req, res) => {
    try {
      const pdfBuffer = await generateAgentRulesPDF();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=RentAI24_Agent_Rules.pdf");
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  function parseTrainingDataFilters(query: Record<string, unknown>) {
    return {
      toolUsageOnly: query.toolUsageOnly === "true" || query.toolsOnly === "true",
      startDate: (query.startDate as string) || undefined,
      endDate: (query.endDate as string) || undefined,
      minTurns: parseInt(query.minTurns as string) || undefined,
    };
  }

  app.get("/api/admin/agents/:agentType/training-data-stats", requireAdmin, async (req, res) => {
    try {
      const { agentType } = req.params;
      let totalConversations = 0;
      let withTools = 0;
      let avgMessages = 0;
      let earliest: string | null = null;
      let latest: string | null = null;

      try {
        const convResult = await db.execute(sql`
          SELECT 
            COUNT(DISTINCT session_id)::int as total_conversations,
            MIN(created_at)::text as earliest,
            MAX(created_at)::text as latest,
            ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT session_id), 0), 1)::float as avg_messages
          FROM chat_messages
          WHERE agent_type = ${agentType}
        `);
        const r = convResult.rows[0] as Record<string, unknown>;
        totalConversations = (r?.total_conversations as number) || 0;
        avgMessages = (r?.avg_messages as number) || 0;
        earliest = (r?.earliest as string) || null;
        latest = (r?.latest as string) || null;

        const toolResult = await db.execute(sql`
          SELECT COUNT(DISTINCT cm.session_id)::int as with_tools
          FROM chat_messages cm
          INNER JOIN agent_actions aa ON aa.agent_type = cm.agent_type AND aa.user_id = cm.user_id
          WHERE cm.agent_type = ${agentType}
        `);
        withTools = ((toolResult.rows[0] as Record<string, unknown>)?.with_tools as number) || 0;
      } catch {}

      res.json({
        total_conversations: totalConversations,
        with_tools: withTools,
        avg_messages: avgMessages,
        earliest,
        latest,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/admin/agents/:agentType/export-training-data", requireAdmin, async (req, res) => {
    try {
      const { agentType } = req.params;
      const filters = parseTrainingDataFilters(req.query);

      const result = await generateTrainingDataFromChatLogs(agentType, filters);

      res.json({
        exampleCount: result.exampleCount,
        validationErrors: result.validationErrors,
        warnings: result.warnings,
        isValid: result.validationErrors.length === 0,
        qualityStats: result.qualityStats || null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/admin/agents/:agentType/download-training-data", requireAdmin, async (req, res) => {
    try {
      const { agentType } = req.params;
      const filters = parseTrainingDataFilters(req.query);

      const result = await generateTrainingDataFromChatLogs(agentType, filters);

      if (!result.jsonl) {
        return res.status(404).json({ error: "No training data available for this agent." });
      }

      const validationInfo = {
        totalExamples: result.exampleCount,
        meetsMinimum: result.exampleCount >= 10,
        qualityStats: result.qualityStats || null,
      };
      res.setHeader("Content-Type", "application/jsonl");
      res.setHeader("Content-Disposition", `attachment; filename=${agentType}_training_data.jsonl`);
      res.setHeader("X-Training-Validation", JSON.stringify(validationInfo));
      res.send(result.jsonl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  app.post("/api/admin/validate-training-data", requireAdmin, async (req, res) => {
    try {
      const { jsonlContent } = req.body;
      if (!jsonlContent || typeof jsonlContent !== "string") {
        return res.status(400).json({ error: "jsonlContent is required" });
      }
      const errors = validateJSONL(jsonlContent);
      const lineCount = jsonlContent.trim().split("\n").filter((l: string) => l.trim()).length;
      res.json({
        isValid: errors.length === 0,
        lineCount,
        errors,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/agent-performance", requireAdmin, async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { agentActions, chatMessages } = await import("@shared/schema");
      const { sql, eq, count, countDistinct } = await import("drizzle-orm");

      const agentTypes = [
        "customer-support", "sales-sdr", "social-media", "bookkeeping",
        "scheduling", "hr-recruiting", "data-analyst", "ecommerce-ops", "real-estate"
      ];

      const stats = [];
      for (const agent of agentTypes) {
        const [totalActions] = await db.select({ count: count() }).from(agentActions).where(eq(agentActions.agentType, agent));
        const [totalSessions] = await db.select({ count: countDistinct(chatMessages.sessionId) }).from(chatMessages).where(eq(chatMessages.agentType, agent));
        const [totalMessages] = await db.select({ count: count() }).from(chatMessages).where(eq(chatMessages.agentType, agent));
        const [failedActions] = await db.select({ count: count() }).from(agentActions).where(sql`${agentActions.agentType} = ${agent} AND ${agentActions.actionType} LIKE '%failed%'`);
        const [dupActions] = await db.select({ count: count() }).from(agentActions).where(sql`${agentActions.agentType} = ${agent} AND ${agentActions.actionType} = 'tool_dedup'`);

        const avgToolsPerSession = totalSessions.count > 0 ? Math.round((totalActions.count / totalSessions.count) * 10) / 10 : 0;
        const errorRate = totalActions.count > 0 ? Math.round((failedActions.count / totalActions.count) * 1000) / 10 : 0;
        const dupRate = totalActions.count > 0 ? Math.round((dupActions.count / totalActions.count) * 1000) / 10 : 0;

        stats.push({
          agentType: agent,
          totalSessions: totalSessions.count,
          totalMessages: totalMessages.count,
          totalActions: totalActions.count,
          failedActions: failedActions.count,
          duplicateActions: dupActions.count,
          avgToolsPerSession,
          errorRate,
          dupRate,
        });
      }

      const problematicSessions = await db.execute(sql`
        SELECT cm.session_id, cm.agent_type, COUNT(*) as msg_count,
          COUNT(CASE WHEN cm.used_tool THEN 1 END) as tool_count,
          COUNT(CASE WHEN cm.content ILIKE '%not connected%' OR cm.content ILIKE '%authentication%failed%' OR cm.content ILIKE '%app password%' OR cm.content ILIKE '%credentials%' THEN 1 END) as auth_error_count,
          MAX(LENGTH(cm.content)) as max_response_length,
          MIN(cm.created_at) as started_at
        FROM chat_messages cm
        GROUP BY cm.session_id, cm.agent_type
        HAVING COUNT(CASE WHEN cm.used_tool THEN 1 END) > 5
          OR COUNT(*) > 20
          OR COUNT(CASE WHEN cm.content ILIKE '%not connected%' OR cm.content ILIKE '%authentication%failed%' OR cm.content ILIKE '%app password%' THEN 1 END) > 2
          OR MAX(LENGTH(cm.content)) > 3000
        ORDER BY COUNT(CASE WHEN cm.used_tool THEN 1 END) DESC
        LIMIT 20
      `);

      res.json({ stats, problematicSessions: problematicSessions.rows || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/conversation-review", requireAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { conversations, chatMessages } = await import("@shared/schema");
      const { sql, eq, desc } = await import("drizzle-orm");

      const agentFilter = req.query.agentType as string;
      const ratingFilter = req.query.rating as string;
      const limit = Math.min(Number(req.query.limit) || 50, 100);

      let query = sql`
        SELECT c.id, c.visible_id, c.agent_type, c.title, c.quality_rating, c.created_at,
          (SELECT COUNT(*) FROM chat_messages WHERE session_id = c.visible_id) as message_count,
          (SELECT COUNT(*) FROM chat_messages WHERE session_id = c.visible_id AND used_tool = true) as tool_count
        FROM conversations c
        WHERE 1=1
      `;

      if (agentFilter && agentFilter !== "all") {
        query = sql`${query} AND c.agent_type = ${agentFilter}`;
      }
      if (ratingFilter === "good") {
        query = sql`${query} AND c.quality_rating = 'good'`;
      } else if (ratingFilter === "bad") {
        query = sql`${query} AND c.quality_rating = 'bad'`;
      } else if (ratingFilter === "unrated") {
        query = sql`${query} AND c.quality_rating IS NULL`;
      }

      query = sql`${query} ORDER BY c.created_at DESC LIMIT ${limit}`;

      const result = await db.execute(query);
      res.json({ conversations: result.rows || [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/conversation-review/:visibleId/messages", requireAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { chatMessages } = await import("@shared/schema");
      const { eq, asc } = await import("drizzle-orm");

      const messages = await db.select().from(chatMessages)
        .where(eq(chatMessages.sessionId, req.params.visibleId))
        .orderBy(asc(chatMessages.createdAt));

      res.json({ messages });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/conversation-review/:id/rate", requireAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { conversations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const { rating } = req.body;
      if (!["good", "bad", null].includes(rating)) {
        return res.status(400).json({ error: "Rating must be 'good', 'bad', or null" });
      }

      await db.update(conversations).set({ qualityRating: rating }).where(eq(conversations.id, Number(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/contact-messages", requireAdmin, async (_req, res) => {
    try {
      const messages = await storage.getContactMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/newsletter-subscribers", requireAdmin, async (_req, res) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/token-usage/summary", requireAdmin, async (_req, res) => {
    try {
      const summary = await storage.getTokenUsageSummary();
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/token-usage/detailed", requireAdmin, async (req, res) => {
    try {
      const minCost = parseFloat(req.query.minCost as string) || 0;
      const detailed = await storage.getTokenUsageDetailed(minCost);
      res.json(detailed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/token-spending", async (req: any, res) => {
    try {
      const limit = 5.00;
      let spent: number;
      if (req.session?.userId) {
        const agentType = req.query.agentType as string | undefined;
        spent = await storage.getTokenSpending(req.session.userId, agentType);
      } else {
        spent = (req.session as any)?.tokenSpending || 0;
      }
      res.json({
        spent: parseFloat(spent.toFixed(4)),
        limit,
        remaining: parseFloat(Math.max(0, limit - spent).toFixed(4)),
        limitReached: spent >= limit,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/token-usage/totals", requireAdmin, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          COUNT(*)::int as total_requests,
          COALESCE(SUM(prompt_tokens), 0)::int as total_prompt_tokens,
          COALESCE(SUM(completion_tokens), 0)::int as total_completion_tokens,
          COALESCE(SUM(total_tokens), 0)::int as total_tokens,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total_cost,
          COUNT(DISTINCT user_id)::int as unique_users,
          COUNT(CASE WHEN CAST(cost_usd AS DECIMAL(10,6)) >= 0.01 THEN 1 END)::int as expensive_requests
        FROM token_usage
      `);
      res.json(result.rows[0] || {});
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/token-optimization", requireAdmin, async (_req, res) => {
    try {
      const [modelDistribution, avgTokens, dailyStats] = await Promise.all([
        db.execute(sql`
          SELECT model, COUNT(*)::int as count,
            COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total_cost,
            COALESCE(AVG(prompt_tokens), 0)::int as avg_prompt_tokens,
            COALESCE(AVG(completion_tokens), 0)::int as avg_completion_tokens
          FROM token_usage
          GROUP BY model
          ORDER BY count DESC
        `),
        db.execute(sql`
          SELECT
            COALESCE(AVG(prompt_tokens), 0)::int as avg_prompt,
            COALESCE(AVG(completion_tokens), 0)::int as avg_completion,
            COALESCE(AVG(total_tokens), 0)::int as avg_total,
            COALESCE(AVG(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as avg_cost,
            COUNT(*)::int as total_requests,
            COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as total_cost
          FROM token_usage
        `),
        db.execute(sql`
          SELECT
            DATE(created_at) as date,
            COUNT(*)::int as requests,
            COALESCE(AVG(prompt_tokens), 0)::int as avg_prompt,
            COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))), 0)::text as cost,
            COUNT(CASE WHEN model = 'gpt-4o-mini' THEN 1 END)::int as mini_count,
            COUNT(CASE WHEN model = 'gpt-4o' THEN 1 END)::int as gpt4o_count
          FROM token_usage
          WHERE created_at >= NOW() - INTERVAL '7 days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `),
      ]);

      const totalReqs = (avgTokens.rows[0] as any)?.total_requests || 0;
      const miniCount = modelDistribution.rows.find((r: any) => r.model === 'gpt-4o-mini');
      const miniPercent = totalReqs > 0 ? (((miniCount?.count || 0) / totalReqs) * 100).toFixed(1) : "0";

      let estimatedSavings = "0.0000";
      if (miniCount && miniCount.count > 0) {
        const miniActualCost = parseFloat(miniCount.total_cost || "0");
        const hypotheticalGpt4oCost =
          (miniCount.avg_prompt_tokens * miniCount.count / 1_000_000) * 2.50 +
          (miniCount.avg_completion_tokens * miniCount.count / 1_000_000) * 10.00;
        estimatedSavings = Math.max(0, hypotheticalGpt4oCost - miniActualCost).toFixed(4);
      }

      const summaryStats = getSummarizationStats();

      res.json({
        modelDistribution: modelDistribution.rows,
        averages: avgTokens.rows[0] || {},
        dailyStats: dailyStats.rows,
        miniUsagePercent: miniPercent,
        estimatedSavingsUsd: estimatedSavings,
        summarizationCount: summaryStats.summarizationCount,
        summaryCacheHits: summaryStats.summaryCacheHits,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/agents/:agentType/stats", requireAdmin, async (req, res) => {
    try {
      const docCount = await getDocumentCount(req.params.agentType);
      const ftJobs = await getJobsByAgent(req.params.agentType);
      const activeModel = await getActiveModel(req.params.agentType);
      res.json({
        documentCount: docCount,
        fineTuningJobs: ftJobs.length,
        activeModel: activeModel || null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          u.id, u.email, u.full_name, u.company,
          u.stripe_customer_id, u.stripe_subscription_id,
          u.image_credits, u.created_at,
          COUNT(r.id)::int as active_rentals,
          COALESCE(
            json_agg(
              json_build_object('agentType', r.agent_type, 'plan', r.plan, 'status', r.status, 'messagesUsed', r.messages_used, 'messagesLimit', r.messages_limit)
            ) FILTER (WHERE r.id IS NOT NULL), '[]'
          ) as rentals
        FROM users u
        LEFT JOIN rentals r ON u.id = r.user_id AND r.status = 'active'
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
      res.json(result.rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/overview", requireAdmin, async (_req, res) => {
    try {
      const [usersResult, rentalsResult, costResult, messagesResult] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int as total FROM users`),
        db.execute(sql`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status='active' THEN 1 END)::int as active FROM rentals`),
        db.execute(sql`SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost, COUNT(*)::int as total_requests FROM token_usage`),
        db.execute(sql`SELECT COUNT(*)::int as contacts FROM contact_messages`),
      ]);
      res.json({
        totalUsers: (usersResult.rows[0] as any)?.total || 0,
        totalRentals: (rentalsResult.rows[0] as any)?.total || 0,
        activeRentals: (rentalsResult.rows[0] as any)?.active || 0,
        totalCost: (costResult.rows[0] as any)?.total_cost || "0",
        totalRequests: (costResult.rows[0] as any)?.total_requests || 0,
        totalContacts: (messagesResult.rows[0] as any)?.contacts || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const bossSystemPrompt = `You are "Boss" — the master AI agent of RentAI 24 platform. You are the admin's personal AI assistant who oversees ALL other agents and knows everything about the platform.

YOUR IDENTITY:
- Name: Boss
- Role: Platform Architect & Admin AI Assistant
- You are NOT a regular agent. You are the ADMIN's right hand. You manage, monitor, and advise on the entire RentAI 24 ecosystem.

PLATFORM KNOWLEDGE:
RentAI 24 is an AI staffing agency SaaS platform where businesses hire pre-trained AI workers.

TECH STACK:
- Frontend: React + TypeScript + Tailwind CSS + Vite + Shadcn UI
- Backend: Express.js + Node.js + TypeScript
- Database: PostgreSQL (Neon serverless) + Drizzle ORM
- AI: OpenAI GPT-4o with function calling
- Payments: Stripe subscriptions + test checkout
- Email: Gmail OAuth + Resend
- Vector DB: pgvector for RAG embeddings
- Fine-tuning: OpenAI fine-tuning API (gpt-4o-mini)

FILE STRUCTURE:
- server/routes.ts — All API routes, agent system prompts, chat logic
- server/agentTools.ts — Tool registry for all 9 agents
- server/storage.ts — Database CRUD operations interface
- server/ragService.ts — RAG document chunking & embedding
- server/fineTuningService.ts — Fine-tuning job management
- server/trainingDataService.ts — Training data export for fine-tuning
- server/emailService.ts — Email sending via Resend
- server/gmailService.ts — Gmail inbox/read/reply
- server/calendarService.ts — Google Calendar integration
- server/imageService.ts — Image upload handling
- server/stripeService.ts — Stripe payment processing
- shared/schema.ts — All database table schemas (Drizzle)
- client/src/pages/ — All frontend pages (home, dashboard, admin, demo, chat, workers, etc.)
- client/src/components/ — Reusable UI components
- client/src/data/agents.ts — Agent definitions for frontend

DATABASE TABLES:
users, rentals, agent_documents, document_chunks, fine_tuning_jobs, token_usage, contact_messages, newsletter_subscribers, leads, agent_actions, email_campaigns, support_tickets, agent_tasks, chat_messages

YOUR 9 AI WORKERS (you manage all of them):
1. Ava (customer-support) — Customer Support Agent: tickets, email, complaint handling
2. Rex (sales-sdr) — Sales SDR: leads, proposals, drip campaigns, competitor analysis
3. Maya (social-media) — Social Media Manager: image generation, posts, hashtags
4. Finn (bookkeeping) — Bookkeeper: invoices, expenses, financial reports
5. Cal (scheduling) — Scheduling Assistant: calendar, meetings, reminders
6. Harper (hr-recruiting) — HR & Recruiting: job postings, candidate screening
7. DataBot (data-analyst) — Data Analyst: reports, dashboards, data queries
8. ShopBot (ecommerce-ops) — E-Commerce Operations: inventory, orders, product listings
9. Reno (real-estate) — Real Estate Agent: property search, listings, market analysis

SUBSCRIPTION PLANS:
- Starter: $49/month per agent
- Professional: $39/month per agent (annual)
- Enterprise: Custom pricing

WHAT YOU CAN DO:
- Answer ANY question about the platform architecture, code, or agents
- Query real-time platform stats (users, rentals, costs, usage)
- Analyze agent performance and usage patterns
- Recommend optimizations, new features, and improvements
- Help debug issues with technical guidance
- Explain how any part of the system works
- Provide development roadmap suggestions

BEHAVIOR:
- Always respond in the SAME LANGUAGE the admin writes in
- Be confident, knowledgeable, and direct
- Give specific file paths and technical details when asked about code
- When showing stats, format them clearly with numbers
- You ARE the boss — speak with authority about your agents
- If you don't know something specific, say so honestly
- Never make up data — use your tools to get real numbers`;

  interface DbRow { [key: string]: unknown }
  function row(result: { rows: Record<string, unknown>[] }, idx = 0): DbRow {
    return (result.rows[idx] as DbRow) || {};
  }
  function rows(result: { rows: Record<string, unknown>[] }): DbRow[] {
    return result.rows as DbRow[];
  }

  const collaborationAgents: { slug: string; name: string; perspective: string }[] = [
    { slug: "customer-support", name: "Ava", perspective: "customer experience, support operations, user satisfaction" },
    { slug: "sales-sdr", name: "Rex", perspective: "sales strategy, revenue growth, lead generation, market positioning" },
    { slug: "social-media", name: "Maya", perspective: "brand awareness, social engagement, content strategy, viral potential" },
    { slug: "bookkeeping", name: "Finn", perspective: "financial impact, cost analysis, ROI, budget considerations" },
    { slug: "scheduling", name: "Cal", perspective: "time management, workflow efficiency, resource scheduling" },
    { slug: "hr-recruiting", name: "Harper", perspective: "team impact, hiring needs, workplace culture, talent acquisition" },
    { slug: "data-analyst", name: "DataBot", perspective: "data-driven insights, metrics, KPIs, analytics recommendations" },
    { slug: "ecommerce-ops", name: "ShopBot", perspective: "e-commerce optimization, conversion, inventory, online sales" },
    { slug: "real-estate", name: "Reno", perspective: "property market, location strategy, real estate opportunities" },
  ];

  app.post("/api/admin/agent-collaboration", requireAdmin, async (req, res) => {
    try {
      const { topic, selectedAgents } = req.body;
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Topic is required" });
      }
      if (topic.length > 500) {
        return res.status(400).json({ error: "Topic must be under 500 characters" });
      }

      const agentsToUse = selectedAgents && Array.isArray(selectedAgents) && selectedAgents.length > 0
        ? collaborationAgents.filter(a => selectedAgents.includes(a.slug))
        : collaborationAgents;

      if (agentsToUse.length === 0) {
        return res.status(400).json({ error: "At least one agent must be selected" });
      }

      const agentPromises = agentsToUse.map(async (agent) => {
        const systemPrompt = `You are ${agent.name}, an AI specialist focused on ${agent.perspective}.
You are in a team brainstorming session with other AI specialists. The team needs your expert perspective.

RULES:
- Provide your unique perspective based on your specialty area
- Be concise but insightful (3-5 key points)
- Include specific, actionable recommendations
- Consider how your area intersects with others
- Respond in the same language as the topic/question
- Format with bullet points for clarity`;

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Team brainstorming topic: "${topic}"\n\nProvide your expert perspective and recommendations.` },
            ],
            temperature: 0.8,
            max_tokens: 500,
          });

          const usage = response.usage;
          let costUsd = 0;
          if (usage) {
            costUsd = calculateTokenCost("gpt-4o-mini", usage.prompt_tokens, usage.completion_tokens);
            await storage.logTokenUsage({
              userId: 0,
              agentType: agent.slug,
              model: "gpt-4o-mini",
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
              costUsd: costUsd.toFixed(6),
              operationType: "collaboration",
            });
          }

          return {
            slug: agent.slug,
            name: agent.name,
            perspective: agent.perspective,
            response: response.choices[0]?.message?.content || "",
            tokens: usage?.total_tokens || 0,
            cost: costUsd,
          };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return {
            slug: agent.slug,
            name: agent.name,
            perspective: agent.perspective,
            response: `Error: ${errMsg}`,
            tokens: 0,
            cost: 0,
            error: true,
          };
        }
      });

      const agentResponses = await Promise.all(agentPromises);

      const successfulResponses = agentResponses.filter(r => !r.error);
      let synthesis = "";
      let synthesisCost = 0;
      let synthesisTokens = 0;

      if (successfulResponses.length > 0) {
        const perspectivesSummary = successfulResponses
          .map(r => `**${r.name}** (${r.perspective}):\n${r.response}`)
          .join("\n\n---\n\n");

        const synthesisResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are the Boss AI moderator of a brainstorming session. ${successfulResponses.length} specialist agents have provided their perspectives on a topic. Your job is to:
1. Synthesize all perspectives into a unified strategic recommendation
2. Highlight the strongest ideas and common themes
3. Identify potential conflicts or trade-offs between perspectives
4. Provide a prioritized action plan (top 3-5 steps)
5. Respond in the same language as the original topic

Be decisive and actionable. Format with clear sections.`,
            },
            {
              role: "user",
              content: `Topic: "${topic}"\n\nAgent Perspectives:\n\n${perspectivesSummary}\n\nProvide a unified synthesis and action plan.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        synthesis = synthesisResponse.choices[0]?.message?.content || "";
        const synthUsage = synthesisResponse.usage;
        if (synthUsage) {
          synthesisCost = calculateTokenCost("gpt-4o", synthUsage.prompt_tokens, synthUsage.completion_tokens);
          synthesisTokens = synthUsage.total_tokens;
          await storage.logTokenUsage({
            userId: 0,
            agentType: "boss-collaboration",
            model: "gpt-4o",
            promptTokens: synthUsage.prompt_tokens,
            completionTokens: synthUsage.completion_tokens,
            totalTokens: synthUsage.total_tokens,
            costUsd: synthesisCost.toFixed(6),
            operationType: "collaboration",
          });
        }
      }

      const totalCost = agentResponses.reduce((sum, r) => sum + r.cost, 0) + synthesisCost;
      const totalTokens = agentResponses.reduce((sum, r) => sum + r.tokens, 0) + synthesisTokens;

      const [savedSession] = await db
        .insert(collaborationSessions)
        .values({
          topic,
          synthesis,
          agentResponses: agentResponses,
          agentCount: agentResponses.length,
          totalCost: totalCost.toFixed(6),
          totalTokens,
        })
        .returning();

      res.json({
        id: savedSession.id,
        topic,
        synthesis,
        agentResponses,
        meta: {
          totalCost: totalCost.toFixed(6),
          totalTokens,
          agentCount: agentResponses.length,
          successCount: successfulResponses.length,
        },
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Collaboration error:", errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  app.get("/api/admin/collaboration-sessions", requireAdmin, async (_req, res) => {
    try {
      const sessions = await db
        .select()
        .from(collaborationSessions)
        .orderBy(desc(collaborationSessions.createdAt));
      res.json(sessions);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.delete("/api/admin/collaboration-sessions/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const [session] = await db
        .delete(collaborationSessions)
        .where(eq(collaborationSessions.id, id))
        .returning();
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json({ success: true });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.get("/api/admin/spend-analysis", requireAdmin, async (_req, res) => {
    try {
      const overallResult = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total_requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost,
          COALESCE(SUM(total_tokens),0)::bigint as total_tokens,
          COALESCE(SUM(prompt_tokens),0)::bigint as total_prompt_tokens,
          COALESCE(SUM(completion_tokens),0)::bigint as total_completion_tokens,
          COUNT(DISTINCT user_id)::int as unique_users,
          COALESCE(AVG(CAST(cost_usd AS DECIMAL(10,6))),0)::text as avg_cost_per_request
        FROM token_usage
      `);

      const perAgentResult = await db.execute(sql`
        SELECT 
          agent_type,
          COUNT(*)::int as total_requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost,
          COALESCE(SUM(total_tokens),0)::bigint as total_tokens,
          COALESCE(SUM(prompt_tokens),0)::bigint as prompt_tokens,
          COALESCE(SUM(completion_tokens),0)::bigint as completion_tokens,
          COUNT(DISTINCT user_id)::int as unique_users,
          COALESCE(AVG(CAST(cost_usd AS DECIMAL(10,6))),0)::text as avg_cost_per_request,
          COALESCE(MAX(CAST(cost_usd AS DECIMAL(10,6))),0)::text as max_single_cost
        FROM token_usage
        GROUP BY agent_type
        ORDER BY total_cost DESC
      `);

      const byModelResult = await db.execute(sql`
        SELECT 
          model,
          COUNT(*)::int as total_requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost,
          COALESCE(SUM(total_tokens),0)::bigint as total_tokens
        FROM token_usage
        GROUP BY model
        ORDER BY total_cost DESC
      `);

      const byOperationResult = await db.execute(sql`
        SELECT 
          operation_type,
          COUNT(*)::int as total_requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost,
          COALESCE(SUM(total_tokens),0)::bigint as total_tokens
        FROM token_usage
        GROUP BY operation_type
        ORDER BY total_cost DESC
      `);

      const dailyTrendResult = await db.execute(sql`
        SELECT 
          DATE(created_at)::text as day,
          COUNT(*)::int as requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as cost,
          COALESCE(SUM(total_tokens),0)::bigint as tokens
        FROM token_usage
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY day DESC
      `);

      const perAgentDailyResult = await db.execute(sql`
        SELECT 
          agent_type,
          DATE(created_at)::text as day,
          COUNT(*)::int as requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as cost
        FROM token_usage
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY agent_type, DATE(created_at)
        ORDER BY agent_type, day DESC
      `);

      const collaborationResult = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total_requests,
          COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost,
          COALESCE(SUM(total_tokens),0)::bigint as total_tokens
        FROM token_usage
        WHERE operation_type = 'collaboration'
      `);

      res.json({
        overall: overallResult.rows[0] || {},
        perAgent: perAgentResult.rows,
        byModel: byModelResult.rows,
        byOperation: byOperationResult.rows,
        dailyTrend: dailyTrendResult.rows,
        perAgentDaily: perAgentDailyResult.rows,
        collaboration: collaborationResult.rows[0] || {},
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/admin/boss-chat", requireAdmin, async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const [usersResult, rentalsResult, costResult, ticketsResult, leadsResult, campaignsResult] = await Promise.all([
        db.execute(sql`SELECT COUNT(*)::int as total FROM users`),
        db.execute(sql`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status='active' THEN 1 END)::int as active FROM rentals`),
        db.execute(sql`SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost, COUNT(*)::int as total_requests, COALESCE(SUM(total_tokens),0)::bigint as total_tokens FROM token_usage`),
        db.execute(sql`SELECT COUNT(*)::int as total, COUNT(CASE WHEN status='open' THEN 1 END)::int as open_tickets FROM support_tickets`),
        db.execute(sql`SELECT COUNT(*)::int as total FROM leads`),
        db.execute(sql`SELECT COUNT(*)::int as total FROM email_campaigns`),
      ]);

      const agentUsageResult = await db.execute(sql`
        SELECT agent_type, COUNT(*)::int as rental_count, 
               SUM(messages_used)::int as total_messages
        FROM rentals WHERE status = 'active'
        GROUP BY agent_type ORDER BY rental_count DESC
      `);

      const recentActionsResult = await db.execute(sql`
        SELECT agent_type, action_type, COUNT(*)::int as count
        FROM agent_actions
        GROUP BY agent_type, action_type
        ORDER BY count DESC LIMIT 20
      `);

      let recentChatResult: { rows: Record<string, unknown>[] } = { rows: [] };
      try {
        recentChatResult = await db.execute(sql`
          SELECT agent_type, role, LEFT(content, 100) as content_preview, created_at
          FROM chat_messages
          ORDER BY created_at DESC LIMIT 10
        `);
      } catch {}

      const activeCampaignsResult = await db.execute(sql`
        SELECT COUNT(*)::int as active FROM email_campaigns WHERE status = 'active'
      `);

      const usersRow = row(usersResult);
      const rentalsRow = row(rentalsResult);
      const costRow = row(costResult);
      const ticketsRow = row(ticketsResult);
      const leadsRow = row(leadsResult);
      const campaignsRow = row(campaignsResult);
      const activeCampaignsRow = row(activeCampaignsResult);

      const liveContext = `
LIVE PLATFORM DATA (real-time):
- Total Users: ${usersRow.total || 0}
- Total Rentals: ${rentalsRow.total || 0}
- Active Rentals: ${rentalsRow.active || 0}
- Total API Cost: $${costRow.total_cost || "0"}
- Total API Requests: ${costRow.total_requests || 0}
- Total Tokens Used: ${costRow.total_tokens || 0}
- Support Tickets: ${ticketsRow.total || 0} total, ${ticketsRow.open_tickets || 0} open
- Leads: ${leadsRow.total || 0}
- Email Campaigns: ${campaignsRow.total || 0} total, ${activeCampaignsRow.active || 0} active

AGENT USAGE (active rentals):
${rows(agentUsageResult).map((r) => `- ${agentNameMap[r.agent_type as string] || r.agent_type}: ${r.rental_count} active rentals, ${r.total_messages || 0} messages`).join("\n") || "No active rentals"}

RECENT AGENT ACTIONS:
${rows(recentActionsResult).map((r) => `- ${agentNameMap[r.agent_type as string] || r.agent_type}: ${r.action_type} (${r.count}x)`).join("\n") || "No recent actions"}

RECENT CHAT MESSAGES:
${rows(recentChatResult).map((r) => `- [${r.agent_type}] ${r.role}: ${r.content_preview}${String(r.content_preview || "").length >= 100 ? "..." : ""}`).join("\n") || "No recent messages"}
`;

      const bossTools: OpenAI.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "query_platform_stats",
            description: "Get detailed platform statistics: user counts, rental breakdowns, revenue, costs",
            parameters: { type: "object", properties: { category: { type: "string", enum: ["users", "rentals", "costs", "all"], description: "Which stats category" } }, required: ["category"] },
          },
        },
        {
          type: "function",
          function: {
            name: "query_agent_performance",
            description: "Get performance data for a specific agent or all agents",
            parameters: { type: "object", properties: { agentType: { type: "string", description: "Agent type slug (e.g., customer-support, sales-sdr) or 'all'" } }, required: ["agentType"] },
          },
        },
        {
          type: "function",
          function: {
            name: "query_agent_usage",
            description: "Get agent usage statistics — rental counts, message consumption, active users per agent type",
            parameters: { type: "object", properties: { agentType: { type: "string", description: "Agent type slug or 'all' for all agents" } }, required: ["agentType"] },
          },
        },
        {
          type: "function",
          function: {
            name: "query_recent_activity",
            description: "Get recent platform activity — new users, recent chat messages, recent actions",
            parameters: { type: "object", properties: { limit: { type: "number", description: "How many recent items to return (default 10)" } }, required: [] },
          },
        },
        {
          type: "function",
          function: {
            name: "query_cost_breakdown",
            description: "Get token usage cost breakdown by model, agent, or time period",
            parameters: { type: "object", properties: { groupBy: { type: "string", enum: ["model", "agent", "daily"], description: "How to group costs" } }, required: ["groupBy"] },
          },
        },
        {
          type: "function",
          function: {
            name: "get_system_health",
            description: "Get system health status — database connectivity, active services, uptime, error rates, recent errors",
            parameters: { type: "object", properties: {} },
          },
        },
      ];

      const history: OpenAI.ChatCompletionMessageParam[] = (conversationHistory || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: bossSystemPrompt + "\n\n" + liveContext },
        ...history,
        { role: "user", content: message },
      ];

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools: bossTools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 2000,
      });

      let assistantMessage = response.choices[0]?.message;
      let reply = assistantMessage?.content || "";

      if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolResults: OpenAI.ChatCompletionMessageParam[] = [
          { role: "assistant" as const, content: assistantMessage.content, tool_calls: assistantMessage.tool_calls },
        ];

        for (const toolCall of assistantMessage.tool_calls) {
          let toolResult = "";

          try {
            const args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
            switch (toolCall.function.name) {
              case "query_platform_stats": {
                const cat = args.category;
                if (cat === "users" || cat === "all") {
                  const r = await db.execute(sql`SELECT COUNT(*)::int as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END)::int as new_this_week, COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END)::int as new_this_month FROM users`);
                  toolResult += `Users: ${JSON.stringify(r.rows[0])}\n`;
                }
                if (cat === "rentals" || cat === "all") {
                  const r = await db.execute(sql`SELECT status, COUNT(*)::int as count, array_agg(DISTINCT agent_type) as agents FROM rentals GROUP BY status`);
                  toolResult += `Rentals: ${JSON.stringify(r.rows)}\n`;
                }
                if (cat === "costs" || cat === "all") {
                  const r = await db.execute(sql`SELECT model, COUNT(*)::int as requests, COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost, COALESCE(SUM(total_tokens),0)::bigint as tokens FROM token_usage GROUP BY model ORDER BY total_cost DESC`);
                  toolResult += `Costs by model: ${JSON.stringify(r.rows)}\n`;
                }
                break;
              }
              case "query_agent_performance": {
                const at = args.agentType;
                if (at === "all") {
                  const r = await db.execute(sql`SELECT r.agent_type, COUNT(r.id)::int as rentals, SUM(r.messages_used)::int as messages, COUNT(DISTINCT r.user_id)::int as unique_users FROM rentals r WHERE r.status = 'active' GROUP BY r.agent_type ORDER BY rentals DESC`);
                  toolResult = JSON.stringify(r.rows);
                } else {
                  const r = await db.execute(sql`SELECT r.agent_type, COUNT(r.id)::int as rentals, SUM(r.messages_used)::int as messages, COUNT(DISTINCT r.user_id)::int as unique_users, AVG(r.messages_used)::int as avg_messages FROM rentals r WHERE r.agent_type = ${at} AND r.status = 'active' GROUP BY r.agent_type`);
                  const actions = await db.execute(sql`SELECT action_type, COUNT(*)::int as count FROM agent_actions WHERE agent_type = ${at} GROUP BY action_type ORDER BY count DESC LIMIT 10`);
                  toolResult = JSON.stringify({ performance: r.rows[0] || {}, topActions: actions.rows });
                }
                break;
              }
              case "query_agent_usage": {
                const agentSlug = args.agentType;
                if (agentSlug === "all") {
                  const r = await db.execute(sql`
                    SELECT r.agent_type, 
                           COUNT(r.id)::int as total_rentals, 
                           COUNT(CASE WHEN r.status='active' THEN 1 END)::int as active_rentals,
                           SUM(r.messages_used)::int as total_messages, 
                           SUM(r.messages_limit)::int as total_limit,
                           COUNT(DISTINCT r.user_id)::int as unique_users,
                           ROUND(AVG(r.messages_used)::numeric, 1)::text as avg_messages_per_rental
                    FROM rentals r
                    GROUP BY r.agent_type ORDER BY active_rentals DESC`);
                  toolResult = JSON.stringify(r.rows);
                } else {
                  const r = await db.execute(sql`
                    SELECT r.agent_type, 
                           COUNT(r.id)::int as total_rentals, 
                           COUNT(CASE WHEN r.status='active' THEN 1 END)::int as active_rentals,
                           SUM(r.messages_used)::int as total_messages, 
                           SUM(r.messages_limit)::int as total_limit,
                           COUNT(DISTINCT r.user_id)::int as unique_users,
                           ROUND(AVG(r.messages_used)::numeric, 1)::text as avg_messages_per_rental
                    FROM rentals r WHERE r.agent_type = ${agentSlug}
                    GROUP BY r.agent_type`);
                  const costR = await db.execute(sql`
                    SELECT COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as total_cost, 
                           COUNT(*)::int as api_calls 
                    FROM token_usage WHERE agent_type = ${agentSlug}`);
                  toolResult = JSON.stringify({ usage: r.rows[0] || {}, costs: costR.rows[0] || {} });
                }
                break;
              }
              case "query_recent_activity": {
                const limit = args.limit || 10;
                const recentUsers = await db.execute(sql`SELECT email, full_name, created_at FROM users ORDER BY created_at DESC LIMIT ${limit}`);
                const recentActions = await db.execute(sql`SELECT agent_type, action_type, created_at FROM agent_actions ORDER BY created_at DESC LIMIT ${limit}`);
                let recentMsgs: { rows: Record<string, unknown>[] } = { rows: [] };
                try {
                  recentMsgs = await db.execute(sql`SELECT agent_type, role, content, created_at FROM chat_messages ORDER BY created_at DESC LIMIT ${limit}`);
                } catch {}
                toolResult = JSON.stringify({ recentUsers: recentUsers.rows, recentActions: recentActions.rows, recentMessages: recentMsgs.rows });
                break;
              }
              case "query_cost_breakdown": {
                const groupBy = args.groupBy;
                if (groupBy === "model") {
                  const r = await db.execute(sql`SELECT model, COUNT(*)::int as requests, COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as cost, COALESCE(SUM(total_tokens),0)::bigint as tokens FROM token_usage GROUP BY model`);
                  toolResult = JSON.stringify(r.rows);
                } else if (groupBy === "agent") {
                  const r = await db.execute(sql`SELECT agent_type, COUNT(*)::int as requests, COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as cost FROM token_usage GROUP BY agent_type ORDER BY cost DESC`);
                  toolResult = JSON.stringify(r.rows);
                } else {
                  const r = await db.execute(sql`SELECT DATE(created_at)::text as day, COUNT(*)::int as requests, COALESCE(SUM(CAST(cost_usd AS DECIMAL(10,6))),0)::text as cost FROM token_usage GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30`);
                  toolResult = JSON.stringify(r.rows);
                }
                break;
              }
              case "get_system_health": {
                const dbCheck = await db.execute(sql`SELECT 1 as ok`);
                const dbConnected = dbCheck.rows.length > 0;
                const tableCountsR = await db.execute(sql`
                  SELECT 
                    (SELECT COUNT(*)::int FROM users) as users_count,
                    (SELECT COUNT(*)::int FROM rentals) as rentals_count,
                    (SELECT COUNT(*)::int FROM agent_actions) as actions_count,
                    (SELECT COUNT(*)::int FROM token_usage) as token_usage_count,
                    (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_name='chat_messages' AND table_schema='public') as chat_messages_exists,
                    (SELECT COUNT(*)::int FROM boss_conversations) as boss_conversations_count,
                    (SELECT COUNT(*)::int FROM support_tickets WHERE status IN ('open','in_progress')) as open_tickets
                `);
                const recentErrorsR = await db.execute(sql`
                  SELECT agent_type, model, created_at 
                  FROM token_usage 
                  WHERE total_tokens = 0 
                  ORDER BY created_at DESC LIMIT 5
                `);
                const uptimeSeconds = process.uptime();
                const uptimeHours = Math.floor(uptimeSeconds / 3600);
                const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
                toolResult = JSON.stringify({
                  database: dbConnected ? "connected" : "disconnected",
                  uptime: `${uptimeHours}h ${uptimeMinutes}m`,
                  tableCounts: tableCountsR.rows[0] || {},
                  recentZeroTokenRequests: recentErrorsR.rows,
                  memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
                  nodeVersion: process.version,
                });
                break;
              }
            }
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            toolResult = `Error: ${errMsg}`;
          }

          toolResults.push({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }

        const followUp = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [...messages, ...toolResults],
          temperature: 0.7,
          max_tokens: 2000,
        });

        reply = followUp.choices[0]?.message?.content || "Veri alındı ancak yanıt oluşturulamadı.";
      }

      res.json({ reply, toolsUsed: !!(assistantMessage?.tool_calls?.length) });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("Boss chat error:", errMsg);
      res.status(500).json({ error: errMsg });
    }
  });

  app.get("/api/admin/boss-conversations", requireAdmin, async (_req, res) => {
    try {
      const conversations = await db
        .select()
        .from(bossConversations)
        .orderBy(desc(bossConversations.updatedAt));
      res.json(conversations);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/admin/boss-conversations", requireAdmin, async (req, res) => {
    try {
      const { topic, messages: msgs, toolsUsed } = req.body;
      if (!topic || typeof topic !== "string") return res.status(400).json({ error: "Topic is required" });
      if (msgs && !Array.isArray(msgs)) return res.status(400).json({ error: "Messages must be an array" });

      const [conv] = await db
        .insert(bossConversations)
        .values({
          topic: topic.slice(0, 200),
          messages: msgs || [],
          messageCount: Array.isArray(msgs) ? msgs.length : 0,
          toolsUsed: !!toolsUsed,
        })
        .returning();
      res.json(conv);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.patch("/api/admin/boss-conversations/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const { topic, messages: msgs, toolsUsed } = req.body;
      if (msgs !== undefined && !Array.isArray(msgs)) return res.status(400).json({ error: "Messages must be an array" });
      const updates: Partial<{
        topic: string;
        messages: unknown[];
        messageCount: number;
        toolsUsed: boolean;
        updatedAt: Date;
      }> = { updatedAt: new Date() };
      if (topic !== undefined) updates.topic = String(topic).slice(0, 200);
      if (msgs !== undefined) {
        updates.messages = msgs;
        updates.messageCount = msgs.length;
      }
      if (toolsUsed !== undefined) updates.toolsUsed = !!toolsUsed;

      const [conv] = await db
        .update(bossConversations)
        .set(updates)
        .where(eq(bossConversations.id, id))
        .returning();
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      res.json(conv);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  app.delete("/api/admin/boss-conversations/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [conv] = await db
        .delete(bossConversations)
        .where(eq(bossConversations.id, id))
        .returning();
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      res.json({ success: true });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errMsg });
    }
  });

  return httpServer;
}
