import { db } from "../db";
import { sql } from "drizzle-orm";

interface ErrorEvent {
  id: string;
  type: "error" | "warning" | "info";
  source: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  userId?: number;
  agentType?: string;
}

interface PerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

const errorBuffer: ErrorEvent[] = [];
const metricsBuffer: PerformanceMetric[] = [];
const MAX_BUFFER = 500;

const agentMetrics: Map<string, {
  totalRequests: number;
  totalTokens: number;
  totalErrors: number;
  avgResponseTime: number;
  responseTimes: number[];
}> = new Map();

export function trackError(error: Error | string, options?: {
  source?: string;
  userId?: number;
  agentType?: string;
  metadata?: Record<string, any>;
  type?: "error" | "warning" | "info";
}) {
  const event: ErrorEvent = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: options?.type || "error",
    source: options?.source || "unknown",
    message: typeof error === "string" ? error : error.message,
    stack: typeof error === "string" ? undefined : error.stack,
    metadata: options?.metadata,
    timestamp: Date.now(),
    userId: options?.userId,
    agentType: options?.agentType,
  };

  errorBuffer.push(event);
  if (errorBuffer.length > MAX_BUFFER) errorBuffer.shift();

  if (event.type === "error") {
    console.error(`[Monitor] ${event.source}: ${event.message}`);
  }
}

export function trackMetric(metric: PerformanceMetric) {
  metricsBuffer.push(metric);
  if (metricsBuffer.length > MAX_BUFFER) metricsBuffer.shift();
}

export function trackAgentRequest(agentType: string, responseTimeMs: number, tokens: number, isError: boolean) {
  let metrics = agentMetrics.get(agentType);
  if (!metrics) {
    metrics = { totalRequests: 0, totalTokens: 0, totalErrors: 0, avgResponseTime: 0, responseTimes: [] };
    agentMetrics.set(agentType, metrics);
  }

  metrics.totalRequests++;
  metrics.totalTokens += tokens;
  if (isError) metrics.totalErrors++;

  metrics.responseTimes.push(responseTimeMs);
  if (metrics.responseTimes.length > 100) metrics.responseTimes.shift();
  metrics.avgResponseTime = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length;
}

export function getRecentErrors(limit = 50, type?: string): ErrorEvent[] {
  let events = [...errorBuffer].reverse();
  if (type) events = events.filter(e => e.type === type);
  return events.slice(0, limit);
}

export function getAgentPerformance(): Record<string, {
  totalRequests: number;
  totalTokens: number;
  totalErrors: number;
  errorRate: string;
  avgResponseTime: number;
  p95ResponseTime: number;
}> {
  const result: Record<string, any> = {};

  for (const [agent, metrics] of agentMetrics) {
    const sorted = [...metrics.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);

    result[agent] = {
      totalRequests: metrics.totalRequests,
      totalTokens: metrics.totalTokens,
      totalErrors: metrics.totalErrors,
      errorRate: metrics.totalRequests > 0
        ? `${((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(1)}%`
        : "0%",
      avgResponseTime: Math.round(metrics.avgResponseTime),
      p95ResponseTime: sorted[p95Index] || 0,
    };
  }

  return result;
}

export function getEndpointMetrics(timeWindowMs = 60 * 60 * 1000): {
  totalRequests: number;
  avgDuration: number;
  errorCount: number;
  slowest: PerformanceMetric[];
} {
  const cutoff = Date.now() - timeWindowMs;
  const recent = metricsBuffer.filter(m => m.timestamp > cutoff);

  const totalRequests = recent.length;
  const avgDuration = totalRequests > 0
    ? Math.round(recent.reduce((sum, m) => sum + m.duration, 0) / totalRequests)
    : 0;
  const errorCount = recent.filter(m => m.statusCode >= 400).length;
  const slowest = [...recent].sort((a, b) => b.duration - a.duration).slice(0, 10);

  return { totalRequests, avgDuration, errorCount, slowest };
}

export function getSystemHealth(): {
  status: "healthy" | "degraded" | "critical";
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  agents: Record<string, any>;
  recentErrors: number;
  connectedClients?: number;
} {
  const mem = process.memoryUsage();
  const recentErrors = errorBuffer.filter(e => e.timestamp > Date.now() - 5 * 60 * 1000 && e.type === "error").length;

  let status: "healthy" | "degraded" | "critical" = "healthy";
  if (recentErrors > 10 || mem.heapUsed / mem.heapTotal > 0.9) status = "critical";
  else if (recentErrors > 3 || mem.heapUsed / mem.heapTotal > 0.7) status = "degraded";

  return {
    status,
    uptime: process.uptime(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    agents: getAgentPerformance(),
    recentErrors,
  };
}

export async function getConversationAnalytics(userId?: number, days = 30): Promise<{
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConv: number;
  agentDistribution: Record<string, number>;
  dailyActivity: Array<{ date: string; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
}> {
  try {
    const userFilter = userId ? sql`AND user_id = ${userId}` : sql``;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const convResult = await db.execute(sql`
      SELECT COUNT(*) as total,
             agent_type,
             DATE(created_at) as day
      FROM conversations
      WHERE created_at >= ${since} ${userFilter}
      GROUP BY agent_type, DATE(created_at)
      ORDER BY day DESC
    `);

    const msgResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM chat_messages
      WHERE created_at >= ${since} ${userFilter}
    `);

    const rows = convResult.rows as any[];
    const agentDistribution: Record<string, number> = {};
    const dailyMap: Map<string, number> = new Map();

    for (const row of rows) {
      agentDistribution[row.agent_type] = (agentDistribution[row.agent_type] || 0) + Number(row.total);
      const day = typeof row.day === "string" ? row.day.split("T")[0] : String(row.day);
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(row.total));
    }

    const totalConversations = Object.values(agentDistribution).reduce((a, b) => a + b, 0);
    const totalMessages = Number((msgResult.rows as any[])[0]?.total || 0);

    return {
      totalConversations,
      totalMessages,
      avgMessagesPerConv: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0,
      agentDistribution,
      dailyActivity: Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topTopics: [],
    };
  } catch (error: any) {
    console.error("[Monitoring] Analytics query error:", error.message);
    return {
      totalConversations: 0,
      totalMessages: 0,
      avgMessagesPerConv: 0,
      agentDistribution: {},
      dailyActivity: [],
      topTopics: [],
    };
  }
}
