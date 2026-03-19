import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { startCampaignRunner } from "./campaignRunner";
import { startScheduledPostRunner } from "./scheduledPostRunner";
import { createServer } from "http";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { pool } from "./db";
import { db } from "./db";
import { rexStageConfig, systemSettings } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { startHeartbeat, stopHeartbeat } from "./services/heartbeat";
import { agentSystemPrompts } from "./routes";

process.on('uncaughtException', (err: Error) => {
  console.error('[FATAL] Uncaught Exception:', err.message, err.stack);
  console.error('[FATAL] Process will exit in 5 seconds...');
  setTimeout(() => process.exit(1), 5000);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL] Unhandled Rejection:', reason instanceof Error ? `${(reason as Error).message}\n${(reason as Error).stack}` : reason);
});

const startupMemory = process.memoryUsage();
console.log(`[Memory] Startup — RSS: ${(startupMemory.rss / 1024 / 1024).toFixed(1)}MB, HeapUsed: ${(startupMemory.heapUsed / 1024 / 1024).toFixed(1)}MB, HeapTotal: ${(startupMemory.heapTotal / 1024 / 1024).toFixed(1)}MB, External: ${(startupMemory.external / 1024 / 1024).toFixed(1)}MB`);

const ADMIN_PATH = process.env.ADMIN_PATH;
if (!ADMIN_PATH) {
  console.error("FATAL: ADMIN_PATH environment variable is not set. Application cannot start.");
  process.exit(1);
}

async function getAutomationMode(): Promise<"legacy" | "n8n"> {
  try {
    const result = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, "automation_runner_mode"));
    if (result.length > 0 && result[0].value === "n8n") {
      return "n8n";
    }
  } catch (e) {}
  return "legacy";
}

const app = express();
const httpServer = createServer(app);

app.disable("x-powered-by");

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.removeHeader("Server");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const PgStore = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "rentai24-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool: pool as unknown as import("pg").Pool,
      createTableIfMissing: true,
    }),
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      const sensitiveRoutes = ["/api/stripe/checkout", "/api/stripe/portal", "/api/stripe/config", `/api/${ADMIN_PATH}/auth`, `/api/${ADMIN_PATH}/`];
      if (capturedJsonResponse && !sensitiveRoutes.some(r => path.startsWith(r))) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      await pool.query("CREATE EXTENSION IF NOT EXISTS vector").catch((err: any) =>
        console.warn("pgvector extension setup:", err.message)
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `).catch((err: unknown) =>
        console.warn("system_settings table setup:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          session_id TEXT,
          agent_type TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `).catch((err: unknown) =>
        console.warn("chat_messages table setup:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS used_tool BOOLEAN DEFAULT FALSE
      `).catch((err: unknown) =>
        console.warn("chat_messages used_tool column:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        ALTER TABLE conversations ADD COLUMN IF NOT EXISTS quality_rating TEXT
      `).catch((err: unknown) =>
        console.warn("conversations quality_rating column:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS boss_conversations (
          id SERIAL PRIMARY KEY,
          topic TEXT NOT NULL,
          messages JSONB NOT NULL DEFAULT '[]',
          message_count INTEGER NOT NULL DEFAULT 0,
          tools_used BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `).catch((err: unknown) =>
        console.warn("boss_conversations table setup:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id SERIAL PRIMARY KEY,
          ip_address TEXT NOT NULL,
          event_type TEXT NOT NULL CHECK (event_type IN ('distillation_attempt', 'guardrail_block', 'rate_limit', 'suspicious_pattern')),
          endpoint TEXT,
          user_agent TEXT,
          user_id INTEGER REFERENCES users(id),
          detail TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `).catch((err: unknown) =>
        console.warn("security_events table setup:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS automation_workflows (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          name TEXT NOT NULL,
          description TEXT,
          trigger_type TEXT NOT NULL DEFAULT 'manual',
          trigger_config JSONB NOT NULL DEFAULT '{}',
          nodes JSONB NOT NULL DEFAULT '[]',
          is_active BOOLEAN NOT NULL DEFAULT false,
          template_id TEXT,
          last_run_at TIMESTAMP,
          run_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `).catch((err: unknown) =>
        console.warn("automation_workflows table setup:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS automation_executions (
          id SERIAL PRIMARY KEY,
          workflow_id INTEGER NOT NULL REFERENCES automation_workflows(id),
          user_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'running',
          trigger_data JSONB NOT NULL DEFAULT '{}',
          node_results JSONB NOT NULL DEFAULT '[]',
          error TEXT,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          completed_at TIMESTAMP
        )
      `).catch((err: unknown) =>
        console.warn("automation_executions table setup:", err instanceof Error ? err.message : String(err))
      );

      await pool.query(`
        CREATE TABLE IF NOT EXISTS collaboration_sessions (
          id SERIAL PRIMARY KEY,
          topic TEXT NOT NULL,
          synthesis TEXT NOT NULL DEFAULT '',
          agent_responses JSONB NOT NULL DEFAULT '[]',
          agent_count INTEGER NOT NULL DEFAULT 0,
          total_cost TEXT NOT NULL DEFAULT '0',
          total_tokens INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `).catch((err: unknown) =>
        console.warn("collaboration_sessions table setup:", err instanceof Error ? err.message : String(err))
      );

      console.log('Initializing Stripe schema...');
      await runMigrations({ databaseUrl });
      console.log('Stripe schema ready');

      const stripeSync = await getStripeSync();

      try {
        console.log('Setting up managed webhook...');
        const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
        await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        console.log('Webhook configured');
      } catch (webhookErr: any) {
        console.error('Webhook setup error (non-fatal):', webhookErr?.message || webhookErr);
      }

      console.log('Syncing Stripe data...');
      try {
        await stripeSync.syncBackfill();
        console.log('Stripe data synced');
      } catch (err: any) {
        console.error('Error syncing Stripe data:', err?.message || err);
      }
    }
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }

  await registerRoutes(httpServer, app);

  const automationMode = await getAutomationMode();
  if (automationMode === "n8n") {
    console.log("[AutomationMode] n8n mode active — legacy runners skipped");
  } else {
    startCampaignRunner();
    startScheduledPostRunner();
  }

  const { startSchedulerService } = await import("./n8n/schedulerService");
  startSchedulerService();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message: status === 404 ? "Not found" : "Internal server error" });
  });

  app.use(`/${ADMIN_PATH}`, (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });

  if (ADMIN_PATH !== "admin") {
    app.use("/admin", (_req: Request, res: Response) => {
      res.status(404).json({ message: "Not found" });
    });
    app.use("/api/admin", (_req: Request, res: Response) => {
      res.status(404).json({ message: "Not found" });
    });
  }

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  try {
    const existingStageConfig = await db.select().from(rexStageConfig);
    if (existingStageConfig.length === 0) {
      await db.insert(rexStageConfig).values([
        { stage: "new_lead", slaDays: 1, defaultProbability: 10, autoActions: [{ action: "calculate_lead_score" }, { action: "plan_first_outreach" }] },
        { stage: "contacted", slaDays: 3, defaultProbability: 20, autoActions: [{ action: "schedule_follow_up", delay_hours: 48 }] },
        { stage: "qualified", slaDays: 5, defaultProbability: 40, autoActions: [{ action: "match_products" }, { action: "prepare_proposal_brief" }] },
        { stage: "proposal_sent", slaDays: 7, defaultProbability: 60, autoActions: [{ action: "schedule_follow_up", delay_hours: 72 }] },
        { stage: "negotiation", slaDays: 10, defaultProbability: 80, autoActions: [{ action: "alert_decision_maker_contact" }] },
        { stage: "closed_won", slaDays: 0, defaultProbability: 100, autoActions: [{ action: "trigger_onboarding" }, { action: "notify_finn_invoice" }] },
        { stage: "closed_lost", slaDays: 0, defaultProbability: 0, autoActions: [{ action: "log_loss_reason" }, { action: "add_to_nurture" }] },
      ]).onConflictDoNothing();
      console.log("[RexCRM] Stage config seeded (7 stages)");
    }
  } catch (err) {
    console.warn("[RexCRM] Stage config seed skipped (table may not exist yet):", (err as Error).message);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startHeartbeat((agentId) => !!agentSystemPrompts[agentId]);
    },
  );

  const gracefulShutdown = (signal: string) => {
    console.log(`[SERVER] ${signal} alındı, sunucu kapatılıyor...`);
    stopHeartbeat();
    httpServer.close(() => {
      console.log('[SERVER] HTTP sunucusu kapatıldı');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
