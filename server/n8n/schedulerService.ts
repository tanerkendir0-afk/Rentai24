import { db } from "../db";
import { automationWorkflows } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { TriggerConfig } from "@shared/schema";

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function normalizeDow(val: number): number {
  return val === 7 ? 0 : val;
}

function matchesCronField(field: string, value: number, isDow = false): boolean {
  if (isDow) value = normalizeDow(value);
  if (field === "*") return true;
  if (field.startsWith("*/")) {
    const step = parseInt(field.substring(2));
    return !isNaN(step) && step > 0 && value % step === 0;
  }
  if (field.includes(",")) {
    return field.split(",").some((v) => {
      const n = parseInt(v.trim());
      return isDow ? normalizeDow(n) === value : n === value;
    });
  }
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    const s = isDow ? normalizeDow(start) : start;
    const e = isDow ? normalizeDow(end) : end;
    return !isNaN(s) && !isNaN(e) && value >= s && value <= e;
  }
  const n = parseInt(field);
  return isDow ? normalizeDow(n) === value : n === value;
}

export function cronMatchesNow(cronExpression: string): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const now = new Date();
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    matchesCronField(minute, now.getMinutes()) &&
    matchesCronField(hour, now.getHours()) &&
    matchesCronField(dayOfMonth, now.getDate()) &&
    matchesCronField(month, now.getMonth() + 1) &&
    matchesCronField(dayOfWeek, now.getDay(), true)
  );
}

export function validateCronExpression(cronExpression: string): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const ranges = [
    { min: 0, max: 59 },
    { min: 0, max: 23 },
    { min: 1, max: 31 },
    { min: 1, max: 12 },
    { min: 0, max: 7 },
  ];

  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    const { min, max } = ranges[i];

    if (field === "*") continue;
    if (/^\*\/\d+$/.test(field)) {
      const step = parseInt(field.substring(2));
      if (isNaN(step) || step < 1) return false;
      continue;
    }
    if (/^\d+$/.test(field)) {
      const val = parseInt(field);
      if (val < min || val > max) return false;
      continue;
    }
    if (/^\d+-\d+$/.test(field)) {
      const [start, end] = field.split("-").map(Number);
      if (start < min || end > max || start > end) return false;
      continue;
    }
    if (/^\d+(,\d+)+$/.test(field)) {
      const vals = field.split(",").map(Number);
      if (vals.some(v => v < min || v > max)) return false;
      continue;
    }
    return false;
  }
  return true;
}

export function computeNextRunAt(cronExpression: string): Date | null {
  if (!validateCronExpression(cronExpression)) return null;

  const parts = cronExpression.trim().split(/\s+/);
  const [minuteField, hourField] = parts;

  const now = new Date();
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  const maxIterations = 60 * 24 * 366;
  for (let i = 0; i < maxIterations; i++) {
    const cMin = candidate.getMinutes();
    const cHour = candidate.getHours();
    const cDay = candidate.getDate();
    const cMonth = candidate.getMonth() + 1;
    const cDow = candidate.getDay();

    const [, , dayOfMonthField, monthField, dayOfWeekField] = parts;

    if (
      matchesCronField(minuteField, cMin) &&
      matchesCronField(hourField, cHour) &&
      matchesCronField(dayOfMonthField, cDay) &&
      matchesCronField(monthField, cMonth) &&
      matchesCronField(dayOfWeekField, cDow, true)
    ) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
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

export async function checkScheduledTasks(): Promise<void> {
  try {
    const { storage } = await import("../storage");
    const tasks = await storage.getActiveScheduledTasks();

    for (const task of tasks) {
      if (!shouldRunNow(task.cronExpression, task.lastRunAt)) continue;

      console.log(`[SchedulerService] Running scheduled task ${task.id} (${task.name}) for user ${task.userId}`);

      try {
        const { executeAndRecordScheduledTask } = await import("./scheduledTaskExecutor");
        const runResult = await executeAndRecordScheduledTask(task);

        if (runResult.status === "completed") {
          console.log(`[SchedulerService] Task ${task.id} completed in ${Math.round(runResult.durationMs / 1000)}s`);
        } else {
          console.error(`[SchedulerService] Task ${task.id} failed: ${runResult.error}`);
        }
      } catch (err: any) {
        console.error(`[SchedulerService] Task ${task.id} unexpected error:`, err.message);
      }
    }
  } catch (err) {
    console.error("[SchedulerService] Error checking scheduled tasks:", err);
  }
}

export async function runSchedulerChecks(): Promise<void> {
  await Promise.all([
    checkScheduledWorkflows(),
    checkScheduledTasks(),
  ]);
}

export function startSchedulerService(): void {
  if (schedulerInterval) return;
  console.log("[SchedulerService] Started — checking scheduled workflows and tasks every minute");
  schedulerInterval = setInterval(runSchedulerChecks, 60 * 1000);
  runSchedulerChecks();
}

export function stopSchedulerService(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[SchedulerService] Stopped");
  }
}
