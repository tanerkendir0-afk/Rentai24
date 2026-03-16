import { circuitBreaker } from "./circuitBreaker";
import { getRelevantToolsForMessage, agentToolRegistry } from "../agentTools";
import { db } from "../db";
import { sql } from "drizzle-orm";

const AGENT_IDS = [
  "customer-support",
  "sales-sdr",
  "social-media",
  "bookkeeping",
  "scheduling",
  "hr-recruiting",
  "data-analyst",
  "ecommerce-ops",
  "real-estate",
];

export interface HeartbeatStatus {
  status: "healthy" | "degraded" | "down";
  lastCheck: number;
  responseTimeMs: number;
  lastError: string | null;
}

const heartbeatStore: Map<string, HeartbeatStatus> = new Map();

let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

async function checkAgent(agentId: string): Promise<HeartbeatStatus> {
  const start = Date.now();
  const errors: string[] = [];

  try {
    const hasTools = agentToolRegistry[agentId] !== undefined;
    if (!hasTools && !["scheduling", "hr-recruiting", "data-analyst", "ecommerce-ops", "real-estate"].includes(agentId)) {
      errors.push(`No tools registered for ${agentId}`);
    }
  } catch (e: any) {
    errors.push(`Tool check failed: ${e.message}`);
  }

  try {
    const tools = getRelevantToolsForMessage(agentId, "test heartbeat");
    if (tools === undefined && agentToolRegistry[agentId]) {
      // tools filtered out is fine
    }
  } catch (e: any) {
    errors.push(`Tool resolution failed: ${e.message}`);
  }

  try {
    await db.execute(sql`SELECT 1`);
  } catch (e: any) {
    errors.push(`DB connection failed: ${e.message}`);
  }

  const responseTimeMs = Date.now() - start;
  let status: HeartbeatStatus["status"] = "healthy";
  if (errors.length > 0) {
    status = errors.some(e => e.includes("DB connection")) ? "down" : "degraded";
  }

  return {
    status,
    lastCheck: Date.now(),
    responseTimeMs,
    lastError: errors.length > 0 ? errors.join("; ") : null,
  };
}

export async function runHeartbeatCheck(): Promise<void> {
  let healthyCount = 0;
  const issues: string[] = [];

  for (const agentId of AGENT_IDS) {
    try {
      const result = await checkAgent(agentId);
      heartbeatStore.set(agentId, result);
      circuitBreaker.setHeartbeatStatus(agentId, result.status, result.responseTimeMs);

      if (result.status === "healthy") {
        healthyCount++;
      } else {
        issues.push(`${agentId}: ${result.status} (${result.lastError})`);
        if (result.status === "down") {
          circuitBreaker.recordFailure(agentId);
        }
      }
    } catch (e: any) {
      const failResult: HeartbeatStatus = {
        status: "down",
        lastCheck: Date.now(),
        responseTimeMs: 0,
        lastError: e.message,
      };
      heartbeatStore.set(agentId, failResult);
      circuitBreaker.setHeartbeatStatus(agentId, "down", 0);
      circuitBreaker.recordFailure(agentId);
      issues.push(`${agentId}: down (${e.message})`);
    }
  }

  if (issues.length === 0) {
    console.log(`[HEARTBEAT] Check complete: ${healthyCount}/${AGENT_IDS.length} healthy`);
  } else {
    console.warn(`[HEARTBEAT] Check complete: ${healthyCount}/${AGENT_IDS.length} healthy | Issues: ${issues.join(", ")}`);
  }
}

export function getHeartbeatStatuses(): Record<string, HeartbeatStatus> {
  return Object.fromEntries(heartbeatStore);
}

export function startHeartbeat(intervalMs = 5 * 60 * 1000, delayMs = 30000): void {
  console.log("[HEARTBEAT] Agent heartbeat monitoring started");
  setTimeout(async () => {
    await runHeartbeatCheck();
    heartbeatInterval = setInterval(() => {
      runHeartbeatCheck().catch(err =>
        console.error("[HEARTBEAT] Unexpected error:", err.message)
      );
    }, intervalMs);
  }, delayMs);
}

export function stopHeartbeat(): void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log("[HEARTBEAT] Agent heartbeat monitoring stopped");
  }
}
