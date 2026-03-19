import { db } from "../db";
import { automationWorkflows } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { TriggerConfig } from "@shared/schema";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function parseCronMinute(cronExpression: string): number | null {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return null;

  if (parts[0] === "0" && parts[1] === "*" && parts[2] === "*" && parts[3] === "*" && parts[4] === "*") {
    return 60;
  }
  if (parts[0].startsWith("*/") && parts[1] === "*") {
    const mins = parseInt(parts[0].substring(2));
    return isNaN(mins) ? null : mins;
  }
  if (parts[0] === "0" && /^\d+$/.test(parts[1])) {
    return 60;
  }

  return 60;
}

function shouldRunNow(cronExpression: string, lastRunAt: Date | null): boolean {
  const intervalMinutes = parseCronMinute(cronExpression);
  if (!intervalMinutes) return false;

  const now = Date.now();
  if (!lastRunAt) return true;

  const elapsed = now - lastRunAt.getTime();
  return elapsed >= intervalMinutes * 60 * 1000;
}

export async function checkScheduledWorkflows(): Promise<void> {
  try {
    const workflows = await db
      .select()
      .from(automationWorkflows)
      .where(and(
        eq(automationWorkflows.isActive, true),
        eq(automationWorkflows.triggerType, "schedule")
      ));

    for (const workflow of workflows) {
      const tc = workflow.triggerConfig as TriggerConfig;
      if (!tc.cronExpression) continue;

      if (shouldRunNow(tc.cronExpression, workflow.lastRunAt)) {
        try {
          const { executeWorkflow } = await import("./workflowEngine");
          await executeWorkflow(workflow.id, workflow.userId, { scheduledAt: new Date().toISOString() });
          console.log(`[SchedulerService] Executed scheduled workflow ${workflow.id} (${workflow.name})`);
        } catch (err) {
          console.error(`[SchedulerService] Failed to execute workflow ${workflow.id}:`, err);
        }
      }
    }
  } catch (err) {
    console.error("[SchedulerService] Error checking scheduled workflows:", err);
  }
}

export function startSchedulerService(): void {
  if (schedulerInterval) return;
  console.log("[SchedulerService] Started — checking scheduled workflows every minute");
  schedulerInterval = setInterval(checkScheduledWorkflows, 60 * 1000);
  checkScheduledWorkflows();
}

export function stopSchedulerService(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[SchedulerService] Stopped");
  }
}
