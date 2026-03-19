import { db } from "../db";
import { automationWorkflows, automationExecutions, type WorkflowNode, type TriggerConfig } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { storage } from "../storage";
import { notifyBoss } from "../bossNotificationService";

export interface ExecutionContext {
  userId: number;
  triggerData: Record<string, any>;
  variables: Record<string, any>;
  nodeResults: Array<{ nodeId: string; label: string; status: string; output?: any; error?: string }>;
}

export async function executeWorkflow(
  workflowId: number,
  userId: number,
  triggerData: Record<string, any>
): Promise<{ success: boolean; executionId: number; error?: string }> {
  const [workflow] = await db
    .select()
    .from(automationWorkflows)
    .where(and(eq(automationWorkflows.id, workflowId), eq(automationWorkflows.userId, userId)));

  if (!workflow || !workflow.isActive) {
    return { success: false, executionId: 0, error: "Workflow not found or inactive" };
  }

  const [execution] = await db
    .insert(automationExecutions)
    .values({
      workflowId,
      userId,
      status: "running",
      triggerData,
      nodeResults: [],
    })
    .returning();

  const nodes = (workflow.nodes as WorkflowNode[]) || [];
  const triggerNode = nodes.find((n) => n.type === "trigger");

  if (!triggerNode) {
    await db
      .update(automationExecutions)
      .set({ status: "failed", error: "No trigger node found", completedAt: new Date() })
      .where(eq(automationExecutions.id, execution.id));
    return { success: false, executionId: execution.id, error: "No trigger node found" };
  }

  const ctx: ExecutionContext = {
    userId,
    triggerData,
    variables: { ...triggerData },
    nodeResults: [],
  };

  try {
    let currentNodeId: string | null | undefined = triggerNode.nextNodeId;

    while (currentNodeId) {
      const node = nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      const result = await executeNode(node, ctx);
      ctx.nodeResults.push(result);

      if (result.status === "error") {
        await db
          .update(automationExecutions)
          .set({
            status: "failed",
            error: result.error,
            nodeResults: ctx.nodeResults,
            completedAt: new Date(),
          })
          .where(eq(automationExecutions.id, execution.id));

        await db
          .update(automationWorkflows)
          .set({ lastRunAt: new Date(), runCount: sql`${automationWorkflows.runCount} + 1` })
          .where(eq(automationWorkflows.id, workflowId));

        return { success: false, executionId: execution.id, error: result.error };
      }

      if (node.type === "condition") {
        currentNodeId = result.output?.conditionMet ? node.conditionTrueNodeId : node.conditionFalseNodeId;
      } else {
        currentNodeId = node.nextNodeId;
      }
    }

    await db
      .update(automationExecutions)
      .set({ status: "completed", nodeResults: ctx.nodeResults, completedAt: new Date() })
      .where(eq(automationExecutions.id, execution.id));

    await db
      .update(automationWorkflows)
      .set({ lastRunAt: new Date(), runCount: sql`${automationWorkflows.runCount} + 1` })
      .where(eq(automationWorkflows.id, workflowId));

    return { success: true, executionId: execution.id };
  } catch (err: any) {
    await db
      .update(automationExecutions)
      .set({
        status: "failed",
        error: err.message,
        nodeResults: ctx.nodeResults,
        completedAt: new Date(),
      })
      .where(eq(automationExecutions.id, execution.id));

    return { success: false, executionId: execution.id, error: err.message };
  }
}

async function executeNode(
  node: WorkflowNode,
  ctx: ExecutionContext
): Promise<{ nodeId: string; label: string; status: string; output?: any; error?: string }> {
  const base = { nodeId: node.id, label: node.label };

  try {
    switch (node.type) {
      case "action":
        return { ...base, ...(await executeAction(node, ctx)) };

      case "condition":
        return { ...base, ...(await evaluateCondition(node, ctx)) };

      case "delay": {
        const delayMs = Math.min((node.config.delaySeconds || 0) * 1000, 30000);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        return { ...base, status: "success", output: { delayed: delayMs } };
      }

      default:
        return { ...base, status: "skipped" };
    }
  } catch (err: any) {
    return { ...base, status: "error", error: err.message };
  }
}

function resolveTemplate(template: string, ctx: ExecutionContext): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path) => {
    const parts = path.split(".");
    let value: any = { ...ctx.variables, ...ctx.triggerData };
    for (const part of parts) {
      if (value == null) return "";
      value = value[part];
    }
    return value != null ? String(value) : "";
  });
}

async function executeAction(
  node: WorkflowNode,
  ctx: ExecutionContext
): Promise<{ status: string; output?: any; error?: string }> {
  const config = node.config || {};

  switch (node.actionType) {
    case "send_email": {
      const to = resolveTemplate(config.to || "", ctx);
      const subject = resolveTemplate(config.subject || "", ctx);
      const body = resolveTemplate(config.body || "", ctx);

      if (!to || !subject) {
        return { status: "error", error: "Email requires 'to' and 'subject'" };
      }

      const result = await sendEmail({
        userId: ctx.userId,
        to,
        subject,
        body,
        agentType: "automation",
      });

      return {
        status: result.success ? "success" : "error",
        output: { to, subject, messageId: result.messageId },
        error: result.success ? undefined : result.message,
      };
    }

    case "create_task": {
      const title = resolveTemplate(config.title || "", ctx);
      const description = resolveTemplate(config.description || "", ctx);
      const agentType = config.agentType || "data-analyst";

      await storage.createAgentTask({
        userId: ctx.userId,
        agentType,
        title,
        description,
        status: "todo",
        priority: config.priority || "medium",
      });

      return { status: "success", output: { title, agentType } };
    }

    case "notify_boss": {
      const summary = resolveTemplate(config.summary || "", ctx);
      const type = config.notificationType || "automation";

      await notifyBoss({
        userId: ctx.userId,
        type,
        teamMemberName: "Otomasyon",
        summary,
        details: ctx.triggerData,
      });

      return { status: "success", output: { summary } };
    }

    case "update_lead": {
      const leadId = config.leadId || ctx.triggerData.leadId;
      if (!leadId) return { status: "error", error: "No leadId specified" };

      const updates: Record<string, any> = {};
      if (config.status) updates.status = resolveTemplate(config.status, ctx);
      if (config.notes) updates.notes = resolveTemplate(config.notes, ctx);

      await storage.updateLead(Number(leadId), ctx.userId, updates);
      return { status: "success", output: { leadId, updates } };
    }

    case "webhook_call": {
      const url = resolveTemplate(config.url || "", ctx);
      if (!url) return { status: "error", error: "No webhook URL specified" };

      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return { status: "error", error: "Only HTTP/HTTPS URLs are allowed" };
        }
        const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]"];
        if (blockedHosts.some((h) => parsed.hostname === h) || parsed.hostname.startsWith("10.") || parsed.hostname.startsWith("192.168.") || parsed.hostname.startsWith("172.")) {
          return { status: "error", error: "Internal/private network URLs are not allowed" };
        }
      } catch {
        return { status: "error", error: "Invalid webhook URL" };
      }

      const method = config.method || "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (config.headers) {
        Object.entries(config.headers).forEach(([k, v]) => {
          headers[k] = resolveTemplate(String(v), ctx);
        });
      }

      const bodyData = config.bodyTemplate
        ? JSON.parse(resolveTemplate(JSON.stringify(config.bodyTemplate), ctx))
        : ctx.triggerData;

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(bodyData),
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text().catch(() => "");
      ctx.variables.webhookResponse = responseText;

      return {
        status: response.ok ? "success" : "error",
        output: { statusCode: response.status, body: responseText.substring(0, 500) },
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    }

    case "log_action": {
      const description = resolveTemplate(config.description || "Automation action logged", ctx);
      await storage.createAgentAction({
        userId: ctx.userId,
        agentType: config.agentType || "automation",
        actionType: "automation_log",
        description,
        metadata: { workflowNodeId: node.id, triggerData: ctx.triggerData },
      });
      return { status: "success", output: { description } };
    }

    case "calculate": {
      const expression = resolveTemplate(config.expression || "", ctx);
      try {
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
        if (!sanitized || sanitized.trim().length === 0) {
          return { status: "error", error: "Invalid calculation expression" };
        }
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (typeof result !== "number" || !isFinite(result)) {
          return { status: "error", error: "Calculation did not produce a valid number" };
        }
        ctx.variables.calculationResult = result;
        return { status: "success", output: { expression: sanitized, result } };
      } catch (e: any) {
        return { status: "error", error: `Calculation failed: ${e.message}` };
      }
    }

    default:
      return { status: "error", error: `Unknown action type: ${node.actionType}` };
  }
}

async function evaluateCondition(
  node: WorkflowNode,
  ctx: ExecutionContext
): Promise<{ status: string; output?: any }> {
  const config = node.config || {};
  const field = config.field || "";
  const operator = config.operator || "equals";
  const compareValue = config.value;

  const parts = field.split(".");
  let actualValue: any = { ...ctx.variables, ...ctx.triggerData };
  for (const part of parts) {
    if (actualValue == null) break;
    actualValue = actualValue[part];
  }

  let conditionMet = false;

  switch (operator) {
    case "equals":
      conditionMet = String(actualValue) === String(compareValue);
      break;
    case "not_equals":
      conditionMet = String(actualValue) !== String(compareValue);
      break;
    case "contains":
      conditionMet = String(actualValue).includes(String(compareValue));
      break;
    case "greater_than":
      conditionMet = Number(actualValue) > Number(compareValue);
      break;
    case "less_than":
      conditionMet = Number(actualValue) < Number(compareValue);
      break;
    case "exists":
      conditionMet = actualValue != null && actualValue !== "";
      break;
    case "not_exists":
      conditionMet = actualValue == null || actualValue === "";
      break;
    default:
      conditionMet = !!actualValue;
  }

  return { status: "success", output: { field, operator, actualValue, compareValue, conditionMet } };
}
