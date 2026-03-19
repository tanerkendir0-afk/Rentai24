import { db } from "../db";
import { automationWorkflows, automationExecutions, type WorkflowNode, type TriggerConfig, type ConditionRule } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { storage } from "../storage";
import { notifyBoss } from "../bossNotificationService";
import { sendTextMessage } from "../whatsappService";

export interface ExecutionContext {
  userId: number;
  triggerData: Record<string, any>;
  variables: Record<string, any>;
  nodeResults: Array<{ nodeId: string; label: string; status: string; output?: any; error?: string; duration?: number; input?: any }>;
}

export async function executeWorkflow(
  workflowId: number,
  userId: number,
  triggerData: Record<string, any>,
  options?: { allowInactive?: boolean }
): Promise<{ success: boolean; executionId: number; error?: string }> {
  const [workflow] = await db
    .select()
    .from(automationWorkflows)
    .where(and(eq(automationWorkflows.id, workflowId), eq(automationWorkflows.userId, userId)));

  if (!workflow) {
    return { success: false, executionId: 0, error: "Workflow not found" };
  }
  if (!workflow.isActive && !options?.allowInactive) {
    return { success: false, executionId: 0, error: "Workflow is inactive. Activate it first or use manual run." };
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

    const MAX_STEPS = 100;
    let stepCount = 0;
    const visitedSequence: string[] = [];

    while (currentNodeId) {
      const node = nodes.find((n) => n.id === currentNodeId);
      if (!node) break;

      stepCount++;
      if (stepCount > MAX_STEPS) {
        ctx.nodeResults.push({
          nodeId: node.id,
          label: node.label,
          status: "error",
          error: `Maximum step limit (${MAX_STEPS}) exceeded — possible cycle detected`,
          duration: 0,
          input: ctx.variables,
        });
        break;
      }

      const nodeInput = { ...ctx.variables };
      const startTime = Date.now();
      const nodeTimeout = node.timeoutMs ? Math.min(node.timeoutMs, 60000) : 0;
      let result: { nodeId: string; label: string; status: string; output?: any; error?: string };
      if (nodeTimeout > 0) {
        const timeoutPromise = new Promise<{ nodeId: string; label: string; status: string; error: string }>((resolve) =>
          setTimeout(() => resolve({ nodeId: node.id, label: node.label, status: "error", error: `Node timed out after ${nodeTimeout}ms` }), nodeTimeout)
        );
        result = await Promise.race([executeNode(node, ctx), timeoutPromise]);
      } else {
        result = await executeNode(node, ctx);
      }

      const maxRetries = node.maxRetries || 0;
      let attempt = 0;
      while (result.status === "error" && attempt < maxRetries) {
        attempt++;
        const delay = node.retryDelayMs || 1000;
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 30000)));
        if (nodeTimeout > 0) {
          const retryTimeoutPromise = new Promise<{ nodeId: string; label: string; status: string; error: string }>((resolve) =>
            setTimeout(() => resolve({ nodeId: node.id, label: node.label, status: "error", error: `Node timed out after ${nodeTimeout}ms (retry ${attempt})` }), nodeTimeout)
          );
          result = await Promise.race([executeNode(node, ctx), retryTimeoutPromise]);
        } else {
          result = await executeNode(node, ctx);
        }
      }

      const duration = Date.now() - startTime;
      ctx.nodeResults.push({ ...result, duration, input: nodeInput });

      if (result.status === "error") {
        if (node.onErrorNodeId) {
          ctx.variables._lastError = result.error;
          currentNodeId = node.onErrorNodeId;
          continue;
        }

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
        const hostname = parsed.hostname.toLowerCase();
        const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]", "metadata.google.internal"];
        if (blockedHosts.some((h) => hostname === h)) {
          return { status: "error", error: "Internal/private network URLs are not allowed" };
        }
        const ipParts = hostname.split(".").map(Number);
        if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
          const [a, b] = ipParts;
          if (a === 10 || a === 127 || a === 0) return { status: "error", error: "Internal/private network URLs are not allowed" };
          if (a === 172 && b >= 16 && b <= 31) return { status: "error", error: "Internal/private network URLs are not allowed" };
          if (a === 192 && b === 168) return { status: "error", error: "Internal/private network URLs are not allowed" };
          if (a === 169 && b === 254) return { status: "error", error: "Internal/private network URLs are not allowed" };
        }
        if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
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

    case "http_request": {
      const url = resolveTemplate(config.url || "", ctx);
      if (!url) return { status: "error", error: "No URL specified" };

      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return { status: "error", error: "Only HTTP/HTTPS URLs are allowed" };
        }
        const hostname = parsed.hostname.toLowerCase();
        const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]", "metadata.google.internal"];
        if (blockedHosts.some((h) => hostname === h) || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
          return { status: "error", error: "Internal/private network URLs are not allowed" };
        }
        const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipMatch) {
          const [, a, b] = ipMatch.map(Number);
          if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127 || (a === 169 && b === 254)) {
            return { status: "error", error: "Private/internal IP addresses are not allowed" };
          }
        }
      } catch {
        return { status: "error", error: "Invalid URL" };
      }

      const method = (config.method || "GET").toUpperCase();
      const headers: Record<string, string> = {};
      if (config.contentType) headers["Content-Type"] = config.contentType;
      else if (["POST", "PUT", "PATCH"].includes(method)) headers["Content-Type"] = "application/json";

      if (config.headers && typeof config.headers === "object") {
        Object.entries(config.headers).forEach(([k, v]) => {
          headers[k] = resolveTemplate(String(v), ctx);
        });
      }

      if (config.authType === "bearer" && config.authToken) {
        headers["Authorization"] = `Bearer ${resolveTemplate(config.authToken, ctx)}`;
      } else if (config.authType === "basic" && config.authUsername) {
        const cred = Buffer.from(`${resolveTemplate(config.authUsername, ctx)}:${resolveTemplate(config.authPassword || "", ctx)}`).toString("base64");
        headers["Authorization"] = `Basic ${cred}`;
      }

      let bodyData: string | undefined;
      if (["POST", "PUT", "PATCH"].includes(method) && config.body) {
        bodyData = typeof config.body === "string" ? resolveTemplate(config.body, ctx) : JSON.stringify(config.body);
      }

      const timeout = Math.min(config.timeout || 15000, 30000);
      const response = await fetch(url, {
        method,
        headers,
        body: bodyData,
        signal: AbortSignal.timeout(timeout),
      });

      const responseText = await response.text().catch(() => "");
      ctx.variables.httpResponse = responseText;
      ctx.variables.httpStatus = response.status;

      let parsedResponse: any = responseText;
      try { parsedResponse = JSON.parse(responseText); } catch {}

      return {
        status: response.ok ? "success" : "error",
        output: { statusCode: response.status, body: typeof parsedResponse === "string" ? parsedResponse.substring(0, 1000) : parsedResponse },
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    }

    case "set_variable": {
      const varName = config.variableName || config.name;
      if (!varName) return { status: "error", error: "No variable name specified" };
      let varValue: any = resolveTemplate(config.value || "", ctx);
      if (config.valueType === "number") varValue = Number(varValue);
      else if (config.valueType === "boolean") varValue = varValue === "true" || varValue === "1";
      else if (config.valueType === "json") { try { varValue = JSON.parse(varValue); } catch {} }
      ctx.variables[varName] = varValue;
      return { status: "success", output: { [varName]: varValue } };
    }

    case "format_data": {
      const format = config.format || "json";
      const sourceField = config.sourceField || "";
      let sourceData = sourceField ? resolveValue(sourceField, ctx) : ctx.variables;

      if (format === "csv" && Array.isArray(sourceData)) {
        const rows = sourceData as Record<string, any>[];
        if (rows.length === 0) {
          ctx.variables.formattedData = "";
          return { status: "success", output: { format, result: "" } };
        }
        const headers = Object.keys(rows[0]);
        const csvLines = [headers.join(","), ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))];
        const csv = csvLines.join("\n");
        ctx.variables.formattedData = csv;
        return { status: "success", output: { format, rowCount: rows.length, result: csv.substring(0, 500) } };
      } else if (format === "json") {
        const json = JSON.stringify(sourceData, null, 2);
        ctx.variables.formattedData = json;
        return { status: "success", output: { format, result: json.substring(0, 500) } };
      } else if (format === "text") {
        const template = config.template || "{{data}}";
        ctx.variables.data = sourceData;
        const result = resolveTemplate(template, ctx);
        ctx.variables.formattedData = result;
        return { status: "success", output: { format, result: result.substring(0, 500) } };
      }

      return { status: "success", output: { format, data: sourceData } };
    }

    case "whatsapp_message": {
      const phone = resolveTemplate(config.phone || "", ctx);
      const message = resolveTemplate(config.message || "", ctx);
      if (!phone || !message) return { status: "error", error: "Phone and message are required" };

      const waResult = await sendTextMessage(ctx.userId, phone, message, "automation");
      if (!waResult.success) {
        return { status: "error", error: waResult.message, output: { phone } };
      }

      return {
        status: "success",
        output: { phone, messagePreview: message.substring(0, 200), whatsappMessageId: waResult.whatsappMessageId },
      };
    }

    case "multi_email": {
      const recipients = (config.recipients || "").split(",").map((e: string) => e.trim()).filter(Boolean);
      if (recipients.length === 0) return { status: "error", error: "No recipients specified" };

      const subject = resolveTemplate(config.subject || "", ctx);
      const body = resolveTemplate(config.body || "", ctx);
      const results: Array<{ to: string; success: boolean }> = [];

      for (const to of recipients) {
        const result = await sendEmail({ userId: ctx.userId, to, subject, body, agentType: "automation" });
        results.push({ to, success: result.success });
      }

      const successCount = results.filter(r => r.success).length;
      return {
        status: successCount > 0 ? "success" : "error",
        output: { sent: successCount, failed: recipients.length - successCount, results },
        error: successCount === 0 ? "All emails failed" : undefined,
      };
    }

    case "db_query": {
      const queryType = config.queryType || "count";
      const table = config.table || "";

      if (!table) return { status: "error", error: "No table specified" };

      const allowedTables = ["agent_tasks", "leads", "agent_actions", "support_tickets"];
      if (!allowedTables.includes(table)) {
        return { status: "error", error: `Table '${table}' is not allowed. Allowed: ${allowedTables.join(", ")}` };
      }

      try {
        if (queryType === "count") {
          const result = await db.execute(sql`SELECT COUNT(*)::int as count FROM ${sql.identifier(table)} WHERE user_id = ${ctx.userId}`);
          const count = result.rows[0]?.count ?? 0;
          ctx.variables.queryResult = count;
          return { status: "success", output: { table, queryType, count } };
        }

        return { status: "success", output: { table, queryType, note: "Only count queries are supported" } };
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : "Unknown error";
        return { status: "error", error: `DB query failed: ${errMsg}` };
      }
    }

    default:
      return { status: "error", error: `Unknown action type: ${node.actionType}` };
  }
}

function resolveValue(path: string, ctx: ExecutionContext): any {
  const parts = path.split(".");
  let value: any = { ...ctx.variables, ...ctx.triggerData };
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}

function evaluateSingleCondition(field: string, operator: string, compareValue: any, ctx: ExecutionContext): boolean {
  const parts = field.split(".");
  let actualValue: any = { ...ctx.variables, ...ctx.triggerData };
  for (const part of parts) {
    if (actualValue == null) break;
    actualValue = actualValue[part];
  }

  switch (operator) {
    case "equals":
      return String(actualValue) === String(compareValue);
    case "not_equals":
      return String(actualValue) !== String(compareValue);
    case "contains":
      return String(actualValue).includes(String(compareValue));
    case "not_contains":
      return !String(actualValue).includes(String(compareValue));
    case "greater_than":
      return Number(actualValue) > Number(compareValue);
    case "less_than":
      return Number(actualValue) < Number(compareValue);
    case "greater_than_or_equal":
      return Number(actualValue) >= Number(compareValue);
    case "less_than_or_equal":
      return Number(actualValue) <= Number(compareValue);
    case "exists":
      return actualValue != null && actualValue !== "";
    case "not_exists":
      return actualValue == null || actualValue === "";
    case "regex": {
      try {
        const re = new RegExp(String(compareValue));
        return re.test(String(actualValue));
      } catch {
        return false;
      }
    }
    case "between": {
      const num = Number(actualValue);
      if (Array.isArray(compareValue) && compareValue.length === 2) {
        return num >= Number(compareValue[0]) && num <= Number(compareValue[1]);
      }
      if (typeof compareValue === "string" && compareValue.includes(",")) {
        const [lo, hi] = compareValue.split(",").map(Number);
        return num >= lo && num <= hi;
      }
      return false;
    }
    case "contains_any_of": {
      const items = Array.isArray(compareValue) ? compareValue : String(compareValue).split(",").map(s => s.trim());
      const strVal = String(actualValue);
      return items.some((item: string) => strVal.includes(item));
    }
    case "starts_with":
      return String(actualValue).startsWith(String(compareValue));
    case "ends_with":
      return String(actualValue).endsWith(String(compareValue));
    default:
      return !!actualValue;
  }
}

async function evaluateCondition(
  node: WorkflowNode,
  ctx: ExecutionContext
): Promise<{ status: string; output?: any }> {
  const config = node.config || {};

  if (node.conditions && node.conditions.length > 0) {
    const logic = node.conditionLogic || "and";
    const results = node.conditions.map((rule: ConditionRule) =>
      evaluateSingleCondition(rule.field, rule.operator, rule.value, ctx)
    );
    const conditionMet = logic === "and" ? results.every(Boolean) : results.some(Boolean);
    return { status: "success", output: { logic, conditionResults: results, conditionMet } };
  }

  const field = config.field || "";
  const operator = config.operator || "equals";
  const compareValue = config.value;
  const conditionMet = evaluateSingleCondition(field, operator, compareValue, ctx);

  return { status: "success", output: { field, operator, conditionMet } };
}
