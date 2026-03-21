import { db } from "../db";
import { automationWorkflows, leads, agentTasks, type TriggerConfig } from "@shared/schema";
import { eq, and, lt, isNull, or } from "drizzle-orm";
import { executeWorkflow } from "./workflowEngine";
import { sql } from "drizzle-orm";

let lastCheckAt: Date | null = null;

export interface EventCheckResult {
  type: string;
  description: string;
  triggeredWorkflows: number;
  errors: string[];
}

export interface EventMonitorConfig {
  checkLeadInactivity?: { enabled: boolean; daysThreshold: number };
  checkOverdueInvoices?: { enabled: boolean; daysThreshold: number };
  checkUncompletedTasks?: { enabled: boolean; daysThreshold: number };
}

export async function getEventMonitorStatus(userId: number): Promise<{
  activeMonitors: Array<{ type: string; label: string; description: string }>;
  lastCheckAt: string | null;
}> {
  const workflows = await db
    .select()
    .from(automationWorkflows)
    .where(
      and(
        eq(automationWorkflows.userId, userId),
        eq(automationWorkflows.isActive, true),
        eq(automationWorkflows.triggerType, "event_monitor")
      )
    );

  const activeMonitors: Array<{ type: string; label: string; description: string }> = [];

  for (const w of workflows) {
    const tc = w.triggerConfig as TriggerConfig & { eventType?: string; daysThreshold?: number };
    if (tc.eventType === "lead_inactivity") {
      activeMonitors.push({
        type: "lead_inactivity",
        label: w.name,
        description: `${tc.daysThreshold || 3} gündür yanıt vermeyen leadler için kontrol`,
      });
    } else if (tc.eventType === "overdue_invoice") {
      activeMonitors.push({
        type: "overdue_invoice",
        label: w.name,
        description: `${tc.daysThreshold || 7} gündür ödenmemiş faturalar için kontrol`,
      });
    } else if (tc.eventType === "uncompleted_tasks") {
      activeMonitors.push({
        type: "uncompleted_tasks",
        label: w.name,
        description: `${tc.daysThreshold || 5} gündür tamamlanmamış görevler için kontrol`,
      });
    }
  }

  return {
    activeMonitors,
    lastCheckAt: lastCheckAt ? lastCheckAt.toISOString() : null,
  };
}

export async function runEventChecks(userId: number): Promise<EventCheckResult[]> {
  const results: EventCheckResult[] = [];

  const workflows = await db
    .select()
    .from(automationWorkflows)
    .where(
      and(
        eq(automationWorkflows.userId, userId),
        eq(automationWorkflows.isActive, true),
        eq(automationWorkflows.triggerType, "event_monitor")
      )
    );

  for (const workflow of workflows) {
    const tc = workflow.triggerConfig as TriggerConfig & { eventType?: string; daysThreshold?: number };

    if (tc.eventType === "lead_inactivity") {
      const result = await checkLeadInactivity(userId, workflow, tc.daysThreshold || 3);
      results.push(result);
    } else if (tc.eventType === "overdue_invoice") {
      const result = await checkOverdueInvoices(userId, workflow, tc.daysThreshold || 7);
      results.push(result);
    } else if (tc.eventType === "uncompleted_tasks") {
      const result = await checkUncompletedTasks(userId, workflow, tc.daysThreshold || 5);
      results.push(result);
    }
  }

  lastCheckAt = new Date();
  return results;
}

async function checkLeadInactivity(
  userId: number,
  workflow: typeof automationWorkflows.$inferSelect,
  daysThreshold: number
): Promise<EventCheckResult> {
  const errors: string[] = [];
  let triggeredWorkflows = 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const inactiveLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.userId, userId),
          or(eq(leads.status, "new"), eq(leads.status, "contacted"), eq(leads.status, "qualified")),
          lt(leads.updatedAt, cutoffDate)
        )
      )
      .limit(10);

    for (const lead of inactiveLeads) {
      const result = await executeWorkflow(workflow.id, userId, {
        leadId: lead.id,
        leadName: lead.name,
        leadEmail: lead.email,
        leadCompany: lead.company || "",
        leadStatus: lead.status,
        daysSinceUpdate: Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
        _trigger: { type: "event_monitor", eventType: "lead_inactivity" },
      });

      if (result.success) {
        triggeredWorkflows++;
      } else {
        errors.push(`Lead ${lead.name}: ${result.error}`);
      }
    }

    return {
      type: "lead_inactivity",
      description: `${daysThreshold} gündür yanıtsız lead kontrolü: ${inactiveLeads.length} lead bulundu`,
      triggeredWorkflows,
      errors,
    };
  } catch (err: any) {
    return {
      type: "lead_inactivity",
      description: `Lead kontrolü başarısız`,
      triggeredWorkflows: 0,
      errors: [err.message],
    };
  }
}

async function checkOverdueInvoices(
  userId: number,
  workflow: typeof automationWorkflows.$inferSelect,
  daysThreshold: number
): Promise<EventCheckResult> {
  const errors: string[] = [];
  let triggeredWorkflows = 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const overdueTasks = await db
      .select()
      .from(agentTasks)
      .where(
        and(
          eq(agentTasks.userId, userId),
          eq(agentTasks.agentType, "bookkeeping"),
          or(eq(agentTasks.status, "todo"), eq(agentTasks.status, "in_progress")),
          sql`${agentTasks.createdAt} < ${cutoffDate.toISOString()}`
        )
      )
      .limit(10);

    for (const task of overdueTasks) {
      const result = await executeWorkflow(workflow.id, userId, {
        taskId: task.id,
        taskTitle: task.title,
        taskStatus: task.status,
        daysOverdue: Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        _trigger: { type: "event_monitor", eventType: "overdue_invoice" },
      });

      if (result.success) {
        triggeredWorkflows++;
      } else {
        errors.push(`Task ${task.title}: ${result.error}`);
      }
    }

    return {
      type: "overdue_invoice",
      description: `${daysThreshold} gündür tamamlanmamış muhasebe görevi: ${overdueTasks.length} görev bulundu`,
      triggeredWorkflows,
      errors,
    };
  } catch (err: any) {
    return {
      type: "overdue_invoice",
      description: `Fatura kontrolü başarısız`,
      triggeredWorkflows: 0,
      errors: [err.message],
    };
  }
}

async function checkUncompletedTasks(
  userId: number,
  workflow: typeof automationWorkflows.$inferSelect,
  daysThreshold: number
): Promise<EventCheckResult> {
  const errors: string[] = [];
  let triggeredWorkflows = 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    const staleTasks = await db
      .select()
      .from(agentTasks)
      .where(
        and(
          eq(agentTasks.userId, userId),
          or(eq(agentTasks.status, "todo"), eq(agentTasks.status, "in_progress")),
          sql`${agentTasks.createdAt} < ${cutoffDate.toISOString()}`
        )
      )
      .limit(10);

    for (const task of staleTasks) {
      const result = await executeWorkflow(workflow.id, userId, {
        taskId: task.id,
        taskTitle: task.title,
        taskAgentType: task.agentType,
        taskStatus: task.status,
        taskPriority: task.priority,
        daysStale: Math.floor((Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        _trigger: { type: "event_monitor", eventType: "uncompleted_tasks" },
      });

      if (result.success) {
        triggeredWorkflows++;
      } else {
        errors.push(`Task ${task.title}: ${result.error}`);
      }
    }

    return {
      type: "uncompleted_tasks",
      description: `${daysThreshold} gündür tamamlanmamış görev kontrolü: ${staleTasks.length} görev bulundu`,
      triggeredWorkflows,
      errors,
    };
  } catch (err: any) {
    return {
      type: "uncompleted_tasks",
      description: `Görev kontrolü başarısız`,
      triggeredWorkflows: 0,
      errors: [err.message],
    };
  }
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startEventMonitor() {
  if (monitorInterval) return;

  const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

  monitorInterval = setInterval(async () => {
    try {
      const { db: database } = await import("../db");
      const { automationWorkflows: wf } = await import("@shared/schema");
      const { eq: eqOp, and: andOp } = await import("drizzle-orm");

      const eventWorkflows = await database
        .select({ userId: wf.userId })
        .from(wf)
        .where(andOp(eqOp(wf.isActive, true), eqOp(wf.triggerType, "event_monitor")));

      const uniqueUserIds = [...new Set(eventWorkflows.map((w) => w.userId))];

      for (const userId of uniqueUserIds) {
        await runEventChecks(userId).catch((err) => {
          console.error(`[EventMonitor] Error for user ${userId}:`, err.message);
        });
      }
    } catch (err: any) {
      console.error("[EventMonitor] Scheduled check error:", err.message);
    }
  }, CHECK_INTERVAL_MS);

  console.log("[EventMonitor] Started, checking every 4 hours");
}

export function stopEventMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}
