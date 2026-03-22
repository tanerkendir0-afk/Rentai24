import { db } from "../db";
import { sql } from "drizzle-orm";

interface ScheduledReport {
  id: number;
  userId: number;
  agentType: string;
  reportType: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  isActive: boolean;
  lastRunAt: string | null;
  recipientEmail: string | null;
}

const REPORT_TYPES: Record<string, {
  label: string;
  agents: string[];
  description: string;
}> = {
  financial_summary: {
    label: "Financial Summary",
    agents: ["bookkeeping"],
    description: "KDV, gelir-gider özeti, ödenmemiş faturalar",
  },
  sales_pipeline: {
    label: "Sales Pipeline Report",
    agents: ["sales-sdr"],
    description: "Lead durumu, pipeline özeti, haftalık performans",
  },
  customer_support_metrics: {
    label: "Support Metrics",
    agents: ["customer-support"],
    description: "Ticket sayısı, çözüm süresi, memnuniyet oranı",
  },
  social_media_performance: {
    label: "Social Media Report",
    agents: ["social-media"],
    description: "Post performansı, etkileşim oranları, büyüme",
  },
  hr_recruitment: {
    label: "Recruitment Report",
    agents: ["hr-recruiting"],
    description: "Açık pozisyonlar, başvuru sayıları, işe alım süreci",
  },
  ecommerce_overview: {
    label: "E-Commerce Overview",
    agents: ["ecommerce-ops"],
    description: "Satış, stok durumu, sipariş istatistikleri",
  },
  general_analytics: {
    label: "General Analytics",
    agents: [],
    description: "Tüm ajanlar genelinde kullanım analizi",
  },
};

export function getAvailableReportTypes() {
  return REPORT_TYPES;
}

export async function createScheduledReport(
  userId: number,
  reportType: string,
  frequency: "daily" | "weekly" | "monthly",
  options?: {
    agentType?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    hour?: number;
    recipientEmail?: string;
  },
): Promise<{ id: number }> {
  const result = await db.execute(sql`
    INSERT INTO scheduled_reports (user_id, agent_type, report_type, frequency, day_of_week, day_of_month, hour, recipient_email)
    VALUES (
      ${userId},
      ${options?.agentType || "all"},
      ${reportType},
      ${frequency},
      ${options?.dayOfWeek || null},
      ${options?.dayOfMonth || null},
      ${options?.hour || 9},
      ${options?.recipientEmail || null}
    )
    RETURNING id
  `);

  const id = (result.rows as any[])[0]?.id;
  console.log(`[ScheduledReports] Created report ${id}: ${reportType} (${frequency}) for user ${userId}`);
  return { id };
}

export async function getScheduledReports(userId: number): Promise<ScheduledReport[]> {
  const result = await db.execute(sql`
    SELECT * FROM scheduled_reports WHERE user_id = ${userId} ORDER BY created_at DESC
  `);
  return result.rows as any as ScheduledReport[];
}

export async function toggleReport(userId: number, reportId: number): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE scheduled_reports
    SET is_active = NOT is_active
    WHERE id = ${reportId} AND user_id = ${userId}
    RETURNING is_active
  `);
  return (result.rows as any[])[0]?.is_active ?? false;
}

export async function deleteScheduledReport(userId: number, reportId: number): Promise<boolean> {
  const result = await db.execute(sql`
    DELETE FROM scheduled_reports WHERE id = ${reportId} AND user_id = ${userId} RETURNING id
  `);
  return (result.rows as any[]).length > 0;
}

export async function generateReport(reportType: string, userId: number, agentType?: string): Promise<{
  title: string;
  generatedAt: string;
  sections: Array<{ heading: string; data: any }>;
}> {
  const generatedAt = new Date().toISOString();
  const config = REPORT_TYPES[reportType];
  const title = config?.label || reportType;

  const sections: Array<{ heading: string; data: any }> = [];

  try {
    if (reportType === "financial_summary" || agentType === "bookkeeping") {
      const tokenResult = await db.execute(sql`
        SELECT SUM(input_tokens + output_tokens) as total_tokens,
               SUM(CAST(estimated_cost AS DECIMAL)) as total_cost
        FROM token_usage
        WHERE user_id = ${userId} AND agent_type = 'bookkeeping'
          AND created_at >= NOW() - INTERVAL '30 days'
      `);
      sections.push({
        heading: "Token Usage (Last 30 Days)",
        data: (tokenResult.rows as any[])[0] || {},
      });
    }

    if (reportType === "sales_pipeline" || agentType === "sales-sdr") {
      const dealsResult = await db.execute(sql`
        SELECT stage, COUNT(*) as count, SUM(CAST(value AS DECIMAL)) as total_value
        FROM rex_deals
        WHERE user_id = ${userId}
        GROUP BY stage
      `);
      sections.push({
        heading: "Pipeline Summary",
        data: dealsResult.rows,
      });
    }

    if (reportType === "general_analytics" || !agentType) {
      const usageResult = await db.execute(sql`
        SELECT agent_type, COUNT(*) as message_count
        FROM chat_messages
        WHERE user_id = ${userId}
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY agent_type
        ORDER BY message_count DESC
      `);
      sections.push({
        heading: "Agent Usage (Last 30 Days)",
        data: usageResult.rows,
      });
    }

    const convResult = await db.execute(sql`
      SELECT COUNT(*) as total_conversations,
             AVG(message_count) as avg_messages
      FROM conversations
      WHERE user_id = ${userId}
        AND created_at >= NOW() - INTERVAL '30 days'
    `);
    sections.push({
      heading: "Conversation Summary",
      data: (convResult.rows as any[])[0] || {},
    });

  } catch (error: any) {
    sections.push({
      heading: "Error",
      data: { message: `Report generation error: ${error.message}` },
    });
  }

  return { title, generatedAt, sections };
}

export async function checkAndRunDueReports(): Promise<number> {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  const dayOfMonth = now.getDate();

  try {
    const result = await db.execute(sql`
      SELECT * FROM scheduled_reports
      WHERE is_active = true AND hour = ${hour}
        AND (
          (frequency = 'daily')
          OR (frequency = 'weekly' AND day_of_week = ${dayOfWeek})
          OR (frequency = 'monthly' AND day_of_month = ${dayOfMonth})
        )
        AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '23 hours')
    `);

    const reports = result.rows as any[];
    let ranCount = 0;

    for (const report of reports) {
      try {
        await generateReport(report.report_type, report.user_id, report.agent_type);
        await db.execute(sql`
          UPDATE scheduled_reports SET last_run_at = NOW() WHERE id = ${report.id}
        `);
        ranCount++;
      } catch (e: any) {
        console.error(`[ScheduledReports] Failed report ${report.id}:`, e.message);
      }
    }

    return ranCount;
  } catch {
    return 0;
  }
}

let reportCheckInterval: ReturnType<typeof setInterval> | null = null;

export function startReportScheduler() {
  reportCheckInterval = setInterval(() => {
    checkAndRunDueReports().then(count => {
      if (count > 0) console.log(`[ScheduledReports] Ran ${count} scheduled reports`);
    }).catch(() => {});
  }, 60 * 60 * 1000);
  console.log("[ScheduledReports] Scheduler started (hourly check)");
}

export function stopReportScheduler() {
  if (reportCheckInterval) {
    clearInterval(reportCheckInterval);
    reportCheckInterval = null;
  }
}
