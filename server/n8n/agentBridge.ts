import { db } from "../db";
import { automationWorkflows, type TriggerConfig } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { executeWorkflow } from "./workflowEngine";

const workflowCache = new Map<number, { workflows: typeof automationWorkflows.$inferSelect[]; cachedAt: number }>();
const CACHE_TTL = 60000;

async function getActiveWorkflowsForUser(userId: number) {
  const cached = workflowCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    return cached.workflows;
  }

  const workflows = await db
    .select()
    .from(automationWorkflows)
    .where(and(eq(automationWorkflows.userId, userId), eq(automationWorkflows.isActive, true)));

  workflowCache.set(userId, { workflows, cachedAt: Date.now() });
  return workflows;
}

export function invalidateWorkflowCache(userId: number) {
  workflowCache.delete(userId);
}

export async function triggerAutomations(params: {
  userId: number;
  toolName: string;
  agentType: string;
  actionType?: string;
  toolResult: Record<string, any>;
}): Promise<void> {
  try {
    const workflows = await getActiveWorkflowsForUser(params.userId);

    const matching = workflows.filter((w) => {
      if (w.triggerType !== "agent_tool_complete") return false;
      const tc = w.triggerConfig as TriggerConfig;
      if (tc.toolName && tc.toolName !== params.toolName) return false;
      if (tc.agentType && tc.agentType !== params.agentType) return false;
      if (tc.actionType && tc.actionType !== params.actionType) return false;
      return true;
    });

    if (matching.length === 0) return;

    for (const workflow of matching) {
      executeWorkflow(workflow.id, params.userId, {
        ...params.toolResult,
        _trigger: {
          toolName: params.toolName,
          agentType: params.agentType,
          actionType: params.actionType,
        },
      }).then((result) => {
        if (!result.success) {
          console.error(`[Automation] Workflow "${workflow.name}" (${workflow.id}) failed:`, result.error);
        } else {
          console.log(`[Automation] Workflow "${workflow.name}" (${workflow.id}) completed successfully`);
        }
      }).catch((err) => {
        console.error(`[Automation] Workflow "${workflow.name}" (${workflow.id}) error:`, err.message);
      });
    }
  } catch (err: any) {
    console.error("[Automation] triggerAutomations error:", err.message);
  }
}

export async function triggerWebhookWorkflow(
  userId: number,
  webhookPath: string,
  data: Record<string, any>
): Promise<{ triggered: number; errors: string[] }> {
  const workflows = await getActiveWorkflowsForUser(userId);
  const matching = workflows.filter((w) => {
    if (w.triggerType !== "webhook") return false;
    const tc = w.triggerConfig as TriggerConfig;
    return tc.webhookPath === webhookPath;
  });

  const errors: string[] = [];
  let triggered = 0;

  for (const workflow of matching) {
    const result = await executeWorkflow(workflow.id, userId, data);
    if (result.success) {
      triggered++;
    } else {
      errors.push(`${workflow.name}: ${result.error}`);
    }
  }

  return { triggered, errors };
}
