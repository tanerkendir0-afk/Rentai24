import { db } from "./db";
import { securityEvents } from "@shared/schema";
import crypto from "crypto";

interface QueryRecord {
  agentType: string;
  timestamp: number;
  normalizedMessage: string;
}

const ipQueryHistory = new Map<string, QueryRecord[]>();
const userQueryHistory = new Map<string, QueryRecord[]>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_DIFFERENT_AGENTS = 5;
const MAX_SIMILAR_QUERIES = 8;
const SIMILARITY_THRESHOLD = 0.6;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function normalizeMessage(msg: string): string {
  return msg
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeMessage(a).split(" "));
  const setB = new Set(normalizeMessage(b).split(" "));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getHistory(map: Map<string, QueryRecord[]>, key: string, now: number): QueryRecord[] {
  const records = map.get(key) || [];
  const recent = records.filter(r => now - r.timestamp < WINDOW_MS);
  map.set(key, recent);
  return recent;
}

export interface DistillationCheckResult {
  allowed: boolean;
  reason?: string;
  throttle?: boolean;
}

export async function checkDistillation(
  message: string,
  agentType: string,
  userId: number | null,
  clientIp: string,
  endpoint?: string,
  userAgent?: string
): Promise<DistillationCheckResult> {
  const now = Date.now();

  const ipKey = `ip:${clientIp}`;
  const ipHistory = getHistory(ipQueryHistory, ipKey, now);

  const uniqueAgents = new Set(ipHistory.map(r => r.agentType));
  uniqueAgents.add(agentType);

  if (uniqueAgents.size >= MAX_DIFFERENT_AGENTS) {
    const detail = `IP ${clientIp} queried ${uniqueAgents.size} different agents in ${WINDOW_MS / 60000} minutes: ${Array.from(uniqueAgents).join(", ")}`;
    await logSecurityEvent(clientIp, "distillation_attempt", endpoint, userAgent, userId, detail);
    return {
      allowed: false,
      reason: "Unusual activity pattern detected. Please slow down and try again later.",
    };
  }

  let similarCount = 0;
  const normalizedMsg = normalizeMessage(message);
  for (const record of ipHistory) {
    if (jaccardSimilarity(normalizedMsg, record.normalizedMessage) > SIMILARITY_THRESHOLD) {
      similarCount++;
    }
  }

  if (similarCount >= MAX_SIMILAR_QUERIES) {
    const detail = `IP ${clientIp} sent ${similarCount} similar queries in ${WINDOW_MS / 60000} minutes to agent ${agentType}`;
    await logSecurityEvent(clientIp, "distillation_attempt", endpoint, userAgent, userId, detail);
    return {
      allowed: false,
      reason: "Too many similar requests detected. Please try again later.",
    };
  }

  if (userId) {
    const userKey = `user:${userId}`;
    const userHistory = getHistory(userQueryHistory, userKey, now);
    const userAgents = new Set(userHistory.map(r => r.agentType));
    userAgents.add(agentType);

    if (userAgents.size >= MAX_DIFFERENT_AGENTS) {
      const detail = `User ${userId} queried ${userAgents.size} different agents in ${WINDOW_MS / 60000} minutes`;
      await logSecurityEvent(clientIp, "distillation_attempt", endpoint, userAgent, userId, detail);
      return {
        allowed: false,
        reason: "Unusual activity pattern detected. Please slow down.",
      };
    }

    userHistory.push({ agentType, timestamp: now, normalizedMessage: normalizedMsg });
    userQueryHistory.set(userKey, userHistory);
  }

  ipHistory.push({ agentType, timestamp: now, normalizedMessage: normalizedMsg });
  ipQueryHistory.set(ipKey, ipHistory);

  const shouldThrottle = uniqueAgents.size >= MAX_DIFFERENT_AGENTS - 1 || similarCount >= MAX_SIMILAR_QUERIES - 2;

  return { allowed: true, throttle: shouldThrottle };
}

export function addWatermark(response: string, userId: number | null, clientIp: string): string {
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${userId || "anon"}-${clientIp}-${Date.now()}`)
    .digest("hex")
    .substring(0, 12);

  const zeroWidthChars = ["\u200B", "\u200C", "\u200D", "\uFEFF"];
  let watermark = "";
  for (const char of fingerprint) {
    const idx = parseInt(char, 16) % zeroWidthChars.length;
    watermark += zeroWidthChars[idx];
  }

  const sentences = response.split(/(?<=[.!?])\s+/);
  if (sentences.length >= 3) {
    const insertIdx = Math.floor(sentences.length / 2);
    sentences[insertIdx] = watermark + sentences[insertIdx];
    return sentences.join(" ");
  }

  return response + watermark;
}

async function logSecurityEvent(
  ipAddress: string,
  eventType: "distillation_attempt" | "guardrail_block" | "rate_limit" | "suspicious_pattern",
  endpoint?: string,
  userAgent?: string,
  userId?: number | null,
  detail?: string
): Promise<void> {
  try {
    await db.insert(securityEvents).values({
      ipAddress,
      eventType,
      endpoint: endpoint || null,
      userAgent: userAgent || null,
      userId: userId || null,
      detail: detail || null,
    });
  } catch (err) {
    console.error("[Security] Failed to log event:", err);
  }
}

export { logSecurityEvent };

setInterval(() => {
  const now = Date.now();
  for (const [key, records] of Array.from(ipQueryHistory.entries())) {
    const recent = records.filter(r => now - r.timestamp < WINDOW_MS);
    if (recent.length === 0) {
      ipQueryHistory.delete(key);
    } else {
      ipQueryHistory.set(key, recent);
    }
  }
  for (const [key, records] of Array.from(userQueryHistory.entries())) {
    const recent = records.filter(r => now - r.timestamp < WINDOW_MS);
    if (recent.length === 0) {
      userQueryHistory.delete(key);
    } else {
      userQueryHistory.set(key, recent);
    }
  }
}, CLEANUP_INTERVAL);
