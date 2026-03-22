import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

interface AgentRateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, AgentRateLimitConfig> = {
  "customer-support": { maxRequests: 30, windowMs: 60_000 },
  "sales-sdr": { maxRequests: 20, windowMs: 60_000 },
  "social-media": { maxRequests: 15, windowMs: 60_000 },
  "bookkeeping": { maxRequests: 15, windowMs: 60_000 },
  "scheduling": { maxRequests: 25, windowMs: 60_000 },
  "hr-recruiting": { maxRequests: 15, windowMs: 60_000 },
  "data-analyst": { maxRequests: 10, windowMs: 60_000 },
  "ecommerce-ops": { maxRequests: 20, windowMs: 60_000 },
  "real-estate": { maxRequests: 15, windowMs: 60_000 },
};

const GLOBAL_DEFAULT: AgentRateLimitConfig = { maxRequests: 20, windowMs: 60_000 };

interface RateBucket {
  count: number;
  resetAt: number;
  blocked: boolean;
}

const buckets: Map<string, RateBucket> = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 60_000);

export function checkAgentRateLimit(
  userId: number | undefined,
  agentType: string,
  ip: string,
): { allowed: boolean; remaining: number; resetAt: number } {
  const config = DEFAULT_LIMITS[agentType] || GLOBAL_DEFAULT;
  const key = userId ? `user:${userId}:${agentType}` : `ip:${ip}:${agentType}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs, blocked: false };
    buckets.set(key, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, config.maxRequests - bucket.count);

  if (bucket.count > config.maxRequests) {
    bucket.blocked = true;
    logRateLimitEvent(userId, agentType, ip).catch(() => {});
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  return { allowed: true, remaining, resetAt: bucket.resetAt };
}

export function perAgentRateLimitMiddleware(getAgentType: (req: Request) => string | null) {
  return (req: Request, res: Response, next: NextFunction) => {
    const agentType = getAgentType(req);
    if (!agentType) return next();

    const userId = (req as any).user?.id;
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const result = checkAgentRateLimit(userId, agentType, ip);

    res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    res.setHeader("X-RateLimit-Reset", result.resetAt.toString());

    if (!result.allowed) {
      return res.status(429).json({
        error: "Rate limit exceeded for this agent",
        agent: agentType,
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      });
    }

    next();
  };
}

async function logRateLimitEvent(userId: number | undefined, agentType: string, ip: string) {
  try {
    await db.execute(sql`
      INSERT INTO security_events (ip_address, event_type, endpoint, user_id, detail)
      VALUES (${ip}, 'rate_limit', ${`/api/chat/${agentType}`}, ${userId || null}, ${`Per-agent rate limit exceeded for ${agentType}`})
    `);
  } catch {}
}

export function getAgentRateLimitStatus(): Record<string, { active: number; blocked: number }> {
  const status: Record<string, { active: number; blocked: number }> = {};
  for (const [key, bucket] of buckets) {
    const agentType = key.split(":").pop() || "unknown";
    if (!status[agentType]) status[agentType] = { active: 0, blocked: 0 };
    if (bucket.blocked) {
      status[agentType].blocked++;
    } else {
      status[agentType].active++;
    }
  }
  return status;
}
