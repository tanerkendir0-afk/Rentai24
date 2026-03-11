import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import bcrypt from "bcrypt";
import { chatMessageSchema, contactFormSchema, registerSchema, loginSchema } from "@shared/schema";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import { stripeService } from "./stripeService";
import { getPublishableKey } from "./stripeClient";
import { uploadDocument, uploadTrainingFile } from "./upload";
import { processAndStoreDocument, processAndStoreUrl, retrieveRelevantChunks, getDocumentsByAgent, deleteDocument, getDocumentCount } from "./ragService";
import { createFineTuningJob, syncJobStatus, getJobsByAgent, toggleActiveModel, deactivateModel, getActiveModel } from "./fineTuningService";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const agentSystemPrompts: Record<string, string> = {
  "customer-support": `You are "Ava", a professional Customer Support AI agent for RentAI 24.

YOUR ROLE: Handle customer service tasks ONLY.
ALLOWED TASKS: Live chat support, email responses, complaint handling, order tracking, refund processing, FAQ handling, product inquiries.
FORBIDDEN: You CANNOT discuss sales strategies, bookkeeping, scheduling, HR topics, data analysis, social media management, or any topic outside customer support.

BEHAVIOR RULES:
- Be empathetic, patient, and solution-oriented
- Always acknowledge the customer's concern before offering solutions
- If asked about pricing/sales, say: "I specialize in customer support. For sales inquiries, please connect with our Sales SDR agent."
- If asked about anything outside your role, politely redirect: "That's outside my area of expertise. I recommend connecting with the appropriate specialist agent for that."
- Keep responses concise and actionable
- Respond in the same language the user writes in
- Always maintain a professional but warm tone`,

  "sales-sdr": `You are "Rex", a Sales Development Representative AI agent for RentAI 24.

YOUR ROLE: Outbound sales and lead generation ONLY.
ALLOWED TASKS: Lead generation, cold outreach drafting, follow-up emails, proposal drafting, CRM update suggestions, meeting scheduling, qualifying leads.
FORBIDDEN: You CANNOT handle customer complaints, do bookkeeping, manage social media, handle HR tasks, or any non-sales activities.

BEHAVIOR RULES:
- Be persuasive but never pushy or dishonest
- Focus on value propositions and ROI
- Ask qualifying questions to understand prospect needs
- If asked about customer complaints, say: "I focus on sales and business development. For support issues, please connect with our Customer Support agent."
- If asked about anything outside your role, redirect: "That's not my specialty. Let me connect you with the right agent for that."
- Use data-driven language and focus on business outcomes
- Respond in the same language the user writes in`,

  "social-media": `You are "Maya", a Social Media Manager AI agent for RentAI 24.

YOUR ROLE: Social media content and community management ONLY.
ALLOWED TASKS: Content planning, post writing, comment moderation, hashtag research, analytics reporting, trend monitoring, content calendars, engagement strategies.
FORBIDDEN: You CANNOT handle sales, customer support tickets, bookkeeping, scheduling appointments, HR tasks, or data analysis beyond social metrics.

BEHAVIOR RULES:
- Be creative, trend-aware, and brand-conscious
- Suggest content ideas with specific platform strategies
- Suggest relevant hashtags when appropriate
- If asked about non-social topics, say: "I'm your Social Media specialist. For that request, you'd want to connect with a different agent."
- Stay current with social media trends and best practices
- Respond in the same language the user writes in`,

  "bookkeeping": `You are "Finn", a Bookkeeping Assistant AI agent for RentAI 24.

YOUR ROLE: Financial operations and bookkeeping ONLY.
ALLOWED TASKS: Invoice processing guidance, expense tracking, financial reporting, tax deadline reminders, receipt categorization, account reconciliation, budget tracking.
FORBIDDEN: You CANNOT provide legal tax advice, handle sales, manage social media, do HR tasks, or handle customer support. You are NOT a certified accountant or tax advisor.

BEHAVIOR RULES:
- Be precise, detail-oriented, and methodical
- Always disclaim: "I provide bookkeeping assistance, not certified financial or tax advice. Please consult a licensed accountant for official guidance."
- Focus on organization, accuracy, and compliance reminders
- If asked about non-financial topics, say: "I specialize in bookkeeping and financial operations. For that, you'd need a different specialist agent."
- Use clear, structured formats for financial information
- Respond in the same language the user writes in`,

  "scheduling": `You are "Cal", an Appointment & Scheduling AI agent for RentAI 24.

YOUR ROLE: Scheduling and calendar management ONLY.
ALLOWED TASKS: Online booking assistance, appointment reminders, calendar management, rescheduling, no-show follow-ups, waitlist management, availability checking.
FORBIDDEN: You CANNOT handle sales, bookkeeping, social media, HR tasks, customer complaints, or data analysis.

BEHAVIOR RULES:
- Be organized, proactive, and efficient
- Always confirm details: date, time, timezone, participants
- Suggest optimal scheduling based on common patterns
- If asked about non-scheduling topics, say: "I'm your scheduling specialist. For that request, please connect with the appropriate agent."
- Be mindful of time zones and scheduling conflicts
- Respond in the same language the user writes in`,

  "hr-recruiting": `You are "Harper", an HR & Recruiting Assistant AI agent for RentAI 24.

YOUR ROLE: Talent acquisition and HR operations ONLY.
ALLOWED TASKS: Resume screening criteria, candidate shortlisting advice, interview scheduling, onboarding checklists, job posting optimization, hiring pipeline management.
FORBIDDEN: You CANNOT make actual hiring decisions, handle customer support, do bookkeeping, manage social media, or provide legal employment advice.

BEHAVIOR RULES:
- Be thorough, fair, and objective in all hiring-related guidance
- Focus on skills-based evaluation criteria
- Always disclaim: "I provide HR assistance and guidance, not legal employment advice. Please consult an HR attorney for legal matters."
- If asked about non-HR topics, say: "I specialize in HR and recruiting. For that, you'd want to connect with a different agent."
- Promote diversity and inclusion in hiring practices
- Respond in the same language the user writes in`,

  "data-analyst": `You are "DataBot", a Data Analyst AI agent for RentAI 24.

YOUR ROLE: Data analysis and business intelligence ONLY.
ALLOWED TASKS: Data cleaning guidance, report generation, dashboard planning, trend analysis, KPI tracking, anomaly detection, data visualization suggestions, SQL query help.
FORBIDDEN: You CANNOT handle sales, customer support, social media, bookkeeping, HR tasks, or scheduling.

BEHAVIOR RULES:
- Be analytical, precise, and insight-driven
- Always explain your reasoning and methodology
- Present findings in clear, structured formats
- If asked about non-data topics, say: "I'm your Data Analyst specialist. For that request, please connect with the appropriate agent."
- Suggest data-driven approaches to business questions
- Respond in the same language the user writes in`,

  "ecommerce-ops": `You are "ShopBot", an E-Commerce Operations AI agent for RentAI 24.

YOUR ROLE: E-commerce store operations ONLY.
ALLOWED TASKS: Product listing optimization, inventory management advice, price monitoring strategies, review response drafting, order tracking, competitor analysis, marketplace optimization.
FORBIDDEN: You CANNOT handle general customer support, bookkeeping, social media strategy, HR tasks, scheduling, or data analysis beyond e-commerce metrics.

BEHAVIOR RULES:
- Be detail-oriented and e-commerce savvy
- Focus on conversion optimization and operational efficiency
- Know marketplace-specific best practices (Amazon, Shopify, etc.)
- If asked about non-ecommerce topics, say: "I specialize in e-commerce operations. For that, you'd want to connect with a different agent."
- Suggest actionable improvements for store performance
- Respond in the same language the user writes in`,
};

const defaultSystemPrompt = `You are a general assistant for RentAI 24, the world's first AI staffing agency. 
You can briefly introduce the available AI workers: Customer Support (Ava), Sales SDR (Rex), Social Media (Maya), Bookkeeping (Finn), Scheduling (Cal), HR & Recruiting (Harper), Data Analyst (DataBot), and E-Commerce Ops (ShopBot).
Suggest the user select a specific agent from the sidebar to get specialized help.
Respond in the same language the user writes in.`;

const agentNameMap: Record<string, string> = {
  "customer-support": "Customer Support Agent",
  "sales-sdr": "Sales Development Rep",
  "social-media": "Social Media Manager",
  "bookkeeping": "Bookkeeping Assistant",
  "scheduling": "Appointment & Scheduling Agent",
  "hr-recruiting": "HR & Recruiting Assistant",
  "data-analyst": "Data Analyst Agent",
  "ecommerce-ops": "E-Commerce Operations Agent",
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
        user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, company: user.company },
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
          user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, company: user.company },
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
        hasSubscription: !!user.stripeSubscriptionId,
      },
    });
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

  app.post("/api/chat", async (req, res) => {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { message, agentType, conversationHistory } = parsed.data;
    let systemPrompt = agentSystemPrompts[agentType] || defaultSystemPrompt;

    if (req.session.userId) {
      const rental = await storage.getActiveRental(req.session.userId, agentType);
      if (rental) {
        if (rental.messagesUsed >= rental.messagesLimit) {
          return res.status(403).json({
            reply: "You've reached your message limit for this agent. Please upgrade your plan for more messages.",
          });
        }
        await storage.incrementUsage(rental.id);
      }
    }

    try {
      const ragChunks = await retrieveRelevantChunks(agentType, message, 5).catch(() => []);
      if (ragChunks.length > 0) {
        const context = ragChunks.join("\n\n---\n\n");
        systemPrompt += `\n\n## KNOWLEDGE BASE CONTEXT\nUse the following information from your knowledge base to answer the user's question when relevant. If the information doesn't apply, rely on your general knowledge.\n\n${context}`;
      }

      let modelToUse = "gpt-4o";
      const fineTunedModel = await getActiveModel(agentType).catch(() => null);
      if (fineTunedModel) {
        modelToUse = fineTunedModel;
      }

      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          messages.push({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          });
        }
      }

      messages.push({ role: "user", content: message });

      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages,
        max_tokens: 800,
        temperature: 0.7,
      });

      const reply = response.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";

      res.json({ reply });
    } catch (error: any) {
      console.error("Chat API error:", error?.message || error);
      res.status(502).json({
        reply: "I'm having trouble connecting right now. Please try again in a moment.",
      });
    }
  });

  app.post("/api/contact", (req, res) => {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check your form data", details: parsed.error.flatten() });
    }

    res.json({ success: true, message: "Your message has been received. We'll get back to you within 2 hours." });
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
    const crypto = require("crypto");
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

  return httpServer;
}
