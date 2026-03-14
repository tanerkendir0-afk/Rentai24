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

const app = express();
const httpServer = createServer(app);

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
      const sensitiveRoutes = ["/api/stripe/checkout", "/api/stripe/portal", "/api/stripe/config", "/api/admin/auth", "/api/admin/"];
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
      await runMigrations({ databaseUrl, schema: 'stripe' });
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

  startCampaignRunner();
  startScheduledPostRunner();

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
