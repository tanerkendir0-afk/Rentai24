import { db } from "../db";
import { automationWorkflows } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { TriggerConfig } from "@shared/schema";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function matchesCronField(field: string, value: number): boolean {
  if (field === "*") return true;
  if (field.startsWith("*/")) {
    const step = parseInt(field.substring(2));
    return !isNaN(step) && step > 0 && value % step === 0;
  }
  if (field.includes(",")) {
    return field.split(",").some((v) => parseInt(v.trim()) === value);
  }
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return !isNaN(start) && !isNaN(end) && value >= start && value <= end;
  }
  return parseInt(field) === value;
}

function cronMatchesNow(cronExpression: string): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const now = new Date();
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    matchesCronField(minute, now.getMinutes()) &&
    matchesCronField(hour, now.getHours()) &&
    matchesCronField(dayOfMonth, now.getDate()) &&
    matchesCronField(month, now.getMonth() + 1) &&
    matchesCronField(dayOfWeek, now.getDay())
  );
}

function shouldRunNow(cronExpression: string, lastRunAt: Date | null): boolean {
  if (!cronMatchesNow(cronExpression)) return false;

  if (!lastRunAt) return true;

  const now = Date.now();
  const elapsed = now - lastRunAt.getTime();
  return elapsed >= 55000;
}

function buildCronFromScheduleConfig(tc: TriggerConfig): string | null {
  if (tc.cronExpression) return tc.cronExpression;
  if (!tc.scheduleType) return null;

  const minute = tc.scheduleMinute ?? 0;
  const hour = tc.scheduleHour ?? 9;

  switch (tc.scheduleType) {
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly": {
      const days = tc.scheduleDaysOfWeek?.join(",") || "1";
      return `${minute} ${hour} * * ${days}`;
    }
    case "monthly": {
      const day = tc.scheduleDayOfMonth || 1;
      return `${minute} ${hour} ${day} * *`;
    }
    case "custom":
      return tc.cronExpression || null;
    default:
      return null;
  }
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
      const cronExpr = buildCronFromScheduleConfig(tc);
      if (!cronExpr) continue;

      if (shouldRunNow(cronExpr, workflow.lastRunAt)) {
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
