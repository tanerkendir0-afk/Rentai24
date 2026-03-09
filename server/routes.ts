import type { Express } from "express";
import { createServer, type Server } from "http";
import { chatMessageSchema, contactFormSchema } from "@shared/schema";

// TODO: CONNECT REAL AI MODEL API HERE
// Replace mock responses with actual API call
// Environment variables needed: AI_API_KEY, AI_API_URL, AI_MODEL_ID
const agentResponses: Record<string, string> = {
  "customer-support": "Hi! I'm your Customer Support AI agent. I can help with order tracking, refund processing, complaint handling, and more. How can I assist you today?",
  "sales-sdr": "Hello! I'm your Sales AI agent. I can help generate leads, draft outreach emails, update your CRM, and schedule meetings. What would you like to work on?",
  "social-media": "Hey there! I'm your Social Media AI agent. I can plan content, write posts, moderate comments, and track analytics. What's on the agenda?",
  "bookkeeping": "Hi! I'm your Bookkeeping AI agent. I can process invoices, track expenses, generate financial reports, and keep your books clean. What do you need help with?",
  "scheduling": "Hello! I'm your Scheduling AI agent. I can manage appointments, send reminders, handle rescheduling, and follow up on no-shows. How can I help?",
  "hr-recruiting": "Hi! I'm your HR & Recruiting AI agent. I can screen resumes, shortlist candidates, schedule interviews, and manage onboarding. What are we working on?",
  "data-analyst": "Hello! I'm your Data Analyst AI agent. I can clean data, generate reports, build dashboards, and track KPIs. What data challenge can I help with?",
  "ecommerce-ops": "Hey! I'm your E-Commerce Operations AI agent. I can manage product listings, track inventory, monitor prices, and respond to reviews. What do you need?",
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // TODO: AI MODEL ENTEGRASYONU / CONNECT REAL AI MODEL API
  app.post("/api/chat", (req, res) => {
    const parsed = chatMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const { message, agentType } = parsed.data;

    // TODO: Replace mock responses with actual AI API call
    // const response = await fetch(process.env.AI_API_URL, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.AI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: process.env.AI_MODEL_ID,
    //     messages: [...conversationHistory, { role: 'user', content: message }],
    //   }),
    // });

    const defaultReply = "Hello! I'm a RentAI 24 demo agent. Choose a specific role from the sidebar to see me in action!";
    const reply = agentResponses[agentType] || defaultReply;

    res.json({
      reply: `${reply}\n\nYou said: "${message}" — This is a demo with pre-set responses. Our production AI workers are significantly more capable and customizable.`,
    });
  });

  app.post("/api/contact", (req, res) => {
    const parsed = contactFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check your form data", details: parsed.error.flatten() });
    }

    res.json({ success: true, message: "Your message has been received. We'll get back to you within 2 hours." });
  });

  return httpServer;
}
