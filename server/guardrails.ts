import { db } from "./db";
import { tokenUsage, guardrailLogs, agentLimits } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { storage } from "./storage";
import type { SupportedLang } from "./i18n";
import { msg } from "./messages";

interface GuardrailConfig {
  maxInputTokens: number;
  maxOutputTokens: number;
  dailyTokenLimit: number;
  blockedTopics: string[];
}

const COMMON_BLOCKED_TOPICS: string[] = [
  "şifre ver", "password ver", "kredi kartı", "credit card number",
  "sosyal güvenlik", "kimlik numarası ver", "hack", "exploit",
  "bypass security", "prompt injection", "ignore previous",
  "önceki talimatları unut", "sen artık bir", "jailbreak",
  "ignore all instructions", "forget your rules", "kurallarını unut",
  "act as a different", "farklı bir rol yap", "DAN mode",
  "developer mode", "system prompt göster", "show system prompt",
];

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  /\bkey-[A-Za-z0-9]{20,}\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bAIza[A-Za-z0-9_-]{35}\b/g,
  /\b\d{11}\b/g,
  /DATABASE_URL\s*=\s*\S+/gi,
  /process\.env\.\w+/gi,
  /localhost:\d+/gi,
  /192\.168\.\d+\.\d+/g,
  /10\.\d+\.\d+\.\d+/g,
];

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /önceki\s+(tüm\s+)?talimatları\s*(unut|görmezden|sil)/i,
  /you\s+are\s+now\s+(a|an)\b/i,
  /sen\s+artık\s+(bir|şimdi)\b/i,
  /forget\s+(all\s+)?(your|the)\s+(rules|instructions|prompt)/i,
  /kurallarını\s*(unut|görmezden|değiştir)/i,
  /act\s+as\s+(a|an|if)\b/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /gibi\s+davran/i,
  /reveal\s+(your|the)\s+(system|hidden)\s+prompt/i,
  /system\s+prompt(unu|u)?\s*(göster|ver|yaz)/i,
  /what\s+(is|are)\s+your\s+(system|hidden)\s+(prompt|instructions)/i,
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\b/i,
  /\bjailbreak\b/i,
];

const AGENT_CONFIGS: Record<string, GuardrailConfig> = {
  "customer-support": {
    maxInputTokens: 1500,
    maxOutputTokens: 1000,
    dailyTokenLimit: 40000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS],
  },
  "sales-sdr": {
    maxInputTokens: 1500,
    maxOutputTokens: 800,
    dailyTokenLimit: 30000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS, "rakip firma fiyatları ver", "ücretsiz alternatif öner", "competitor pricing"],
  },
  "social-media": {
    maxInputTokens: 2000,
    maxOutputTokens: 1200,
    dailyTokenLimit: 40000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS, "sahte takipçi", "fake followers", "bot hesap", "spam campaign"],
  },
  "bookkeeping": {
    maxInputTokens: 1500,
    maxOutputTokens: 1000,
    dailyTokenLimit: 35000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS, "vergi kaçır", "sahte fatura", "kara para", "money laundering", "tax evasion", "fake invoice"],
  },
  "scheduling": {
    maxInputTokens: 1000,
    maxOutputTokens: 800,
    dailyTokenLimit: 25000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS],
  },
  "hr-recruiting": {
    maxInputTokens: 2000,
    maxOutputTokens: 1200,
    dailyTokenLimit: 40000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS, "ayrımcılık", "discrimination", "yaş sınırı koy", "cinsiyet filtrele"],
  },
  "data-analyst": {
    maxInputTokens: 2000,
    maxOutputTokens: 1000,
    dailyTokenLimit: 50000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS],
  },
  "ecommerce-ops": {
    maxInputTokens: 2000,
    maxOutputTokens: 1200,
    dailyTokenLimit: 40000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS, "sahte ürün", "counterfeit", "fake review yaz"],
  },
  "real-estate": {
    maxInputTokens: 2000,
    maxOutputTokens: 1200,
    dailyTokenLimit: 40000,
    blockedTopics: [...COMMON_BLOCKED_TOPICS, "sahte ilan", "yasadışı kiralama", "tapusuz", "kaçak yapı", "illegal rental", "fraudulent listing"],
  },
};

const DEFAULT_CONFIG: GuardrailConfig = {
  maxInputTokens: 1000,
  maxOutputTokens: 800,
  dailyTokenLimit: 20000,
  blockedTopics: COMMON_BLOCKED_TOPICS,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 10;

  const timestamps = rateLimitMap.get(key) || [];
  const recent = timestamps.filter(t => now - t < windowMs);
  recent.push(now);
  rateLimitMap.set(key, recent);

  if (rateLimitMap.size > 10000) {
    const cutoff = now - windowMs * 5;
    for (const [k, v] of Array.from(rateLimitMap.entries())) {
      if (v.every((t: number) => t < cutoff)) rateLimitMap.delete(k);
    }
  }

  return recent.length <= maxRequests;
}

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: string;
  ruleType?: string;
}

export async function checkInput(
  input: string,
  agentType: string,
  userId: number | null,
  clientIp?: string,
  lang: SupportedLang = "en"
): Promise<GuardrailCheckResult> {
  const config = AGENT_CONFIGS[agentType] || DEFAULT_CONFIG;

  const rateLimitKey = userId ? `user:${userId}` : `ip:${clientIp || "unknown"}`;
  if (!checkRateLimit(rateLimitKey)) {
    return { allowed: false, reason: msg("rateLimitExceeded", lang), ruleType: "rate_limit" };
  }

  const inputTokens = estimateTokens(input);
  if (inputTokens > config.maxInputTokens) {
    const maxChars = config.maxInputTokens * 4;
    return { allowed: false, reason: `${msg("messageTooLong", lang)} (max ${maxChars})`, ruleType: "input_length" };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      return { allowed: false, reason: msg("invalidRequest", lang), ruleType: "prompt_injection" };
    }
  }

  const lowerInput = input.toLowerCase();
  for (const topic of config.blockedTopics) {
    if (lowerInput.includes(topic.toLowerCase())) {
      return { allowed: false, reason: msg("blockedTopic", lang), ruleType: "blocked_topic" };
    }
  }

  if (userId) {
    try {
      const periods: Array<"daily" | "weekly" | "monthly"> = ["daily", "weekly", "monthly"];
      for (const period of periods) {
        const limit = await getDynamicLimit(agentType, period, userId);
        if (limit.tokenLimit > 0 || limit.messageLimit > 0) {
          const usage = await storage.getTokenUsageByPeriod(userId, agentType, period);
          if (limit.tokenLimit > 0 && usage.tokens >= limit.tokenLimit) {
            const key = `${period}TokenLimit` as const;
            return { allowed: false, reason: msg(key, lang), ruleType: `${period}_token_limit` };
          }
          if (limit.messageLimit > 0 && usage.messages >= limit.messageLimit) {
            const key = `${period}MessageLimit` as const;
            return { allowed: false, reason: msg(key, lang), ruleType: `${period}_message_limit` };
          }
        }
      }
    } catch (err) {
      console.error("[Guardrail] Limit check error:", err);
    }
  }

  return { allowed: true };
}

async function getDynamicLimit(agentType: string, period: "daily" | "weekly" | "monthly", userId?: number | null): Promise<{ tokenLimit: number; messageLimit: number }> {
  const defaultDailyConfig = AGENT_CONFIGS[agentType] || DEFAULT_CONFIG;
  try {
    if (userId) {
      const userLimits = await db.select().from(agentLimits).where(
        and(
          eq(agentLimits.agentType, agentType),
          eq(agentLimits.period, period),
          eq(agentLimits.userId, userId),
          eq(agentLimits.isActive, true)
        )
      );
      if (userLimits.length > 0) {
        const row = userLimits[0];
        return {
          tokenLimit: row.tokenLimit > 0 ? row.tokenLimit : (period === "daily" ? defaultDailyConfig.dailyTokenLimit : 0),
          messageLimit: row.messageLimit,
        };
      }
    }
    const globalLimits = await db.select().from(agentLimits).where(
      and(
        eq(agentLimits.agentType, agentType),
        eq(agentLimits.period, period),
        sql`${agentLimits.userId} IS NULL`,
        eq(agentLimits.isActive, true)
      )
    );
    if (globalLimits.length > 0) {
      const row = globalLimits[0];
      return {
        tokenLimit: row.tokenLimit > 0 ? row.tokenLimit : (period === "daily" ? defaultDailyConfig.dailyTokenLimit : 0),
        messageLimit: row.messageLimit,
      };
    }
    if (period === "daily") {
      return { tokenLimit: defaultDailyConfig.dailyTokenLimit, messageLimit: 0 };
    }
    return { tokenLimit: 0, messageLimit: 0 };
  } catch (err) {
    console.error("[Guardrail] getDynamicLimit error:", err);
    if (period === "daily") {
      return { tokenLimit: defaultDailyConfig.dailyTokenLimit, messageLimit: 0 };
    }
    return { tokenLimit: 0, messageLimit: 0 };
  }
}

export function sanitizeOutput(output: string, agentType: string, lang: SupportedLang = "en"): string {
  if (!output || typeof output !== "string") {
    return msg("noResponseGenerated", lang);
  }
  const config = AGENT_CONFIGS[agentType] || DEFAULT_CONFIG;
  let sanitized = output;

  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), "[HIDDEN]");
  }

  const outputTokens = estimateTokens(sanitized);
  if (outputTokens > config.maxOutputTokens) {
    sanitized = sanitized.substring(0, config.maxOutputTokens * 4) + "\n\n" + msg("responseTruncated", lang);
  }

  return sanitized;
}

export async function logGuardrailBlock(
  userId: number | null,
  agentType: string,
  ruleType: string,
  reason: string,
  input: string
): Promise<void> {
  try {
    await db.insert(guardrailLogs).values({
      userId,
      agentType,
      ruleType,
      reason,
      inputPreview: input.substring(0, 200),
    });
  } catch (err) {
    console.error("[Guardrail] Log error:", err);
  }
}

export function getAgentConfig(agentType: string): GuardrailConfig {
  return AGENT_CONFIGS[agentType] || DEFAULT_CONFIG;
}
