import OpenAI from "openai";
import { storage } from "../storage";
import type { ScheduledTask } from "@shared/schema";
import { getAgentSystemPrompt } from "../agents/agentPrompts";

const aiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const runningTasks = new Set<number>();

export interface TaskRunResult {
  runId: number;
  status: "completed" | "failed";
  result?: string;
  error?: string;
  durationMs: number;
}

export async function executeAndRecordScheduledTask(task: ScheduledTask): Promise<TaskRunResult> {
  if (runningTasks.has(task.id)) {
    console.log(`[ScheduledTaskExecutor] Task ${task.id} is already running, skipping duplicate execution.`);
    return { runId: -1, status: "failed", error: "Already running", durationMs: 0 };
  }

  runningTasks.add(task.id);
  const startedAt = new Date();

  const { computeNextRunAt } = await import("./schedulerService");
  const nextRunAt = computeNextRunAt(task.cronExpression) || undefined;

  await storage.updateScheduledTaskRunInfo(task.id, {
    lastRunAt: startedAt,
    nextRunAt,
    runCount: (task.runCount || 0) + 1,
  });

  const run = await storage.createScheduledTaskRun({
    taskId: task.id,
    userId: task.userId,
    status: "running",
  });

  let durationMs = 0;

  try {
    const result = await executeAgentTask(task.userId, task.agentType, task.taskPrompt);
    durationMs = Date.now() - startedAt.getTime();

    await storage.updateScheduledTaskRun(run.id, {
      status: "completed",
      result: result.substring(0, 5000),
      durationMs,
      completedAt: new Date(),
    });

    await sendTaskNotifications(task, result, durationMs, null);

    return { runId: run.id, status: "completed", result, durationMs };
  } catch (err: any) {
    durationMs = Date.now() - startedAt.getTime();
    const errorMsg: string = err.message;

    await storage.updateScheduledTaskRun(run.id, {
      status: "failed",
      error: errorMsg,
      durationMs,
      completedAt: new Date(),
    });

    await sendTaskNotifications(task, null, durationMs, errorMsg);

    return { runId: run.id, status: "failed", error: errorMsg, durationMs };
  } finally {
    runningTasks.delete(task.id);
  }
}

async function executeAgentTask(userId: number, agentType: string, taskPrompt: string): Promise<string> {
  let systemPrompt: string =
    (await getAgentSystemPrompt(agentType)) ||
    `Sen ${agentType} alanında uzman bir yapay zeka asistanısın.`;

  try {
    const globalInst = await storage.getGlobalInstruction();
    const agentInst = await storage.getAgentInstruction(agentType);
    if (globalInst?.instructions) {
      systemPrompt += `\n\nADMIN GLOBAL INSTRUCTIONS:\n${globalInst.instructions}`;
    }
    if (agentInst?.instructions) {
      systemPrompt += `\n\nADMIN CUSTOM INSTRUCTIONS:\n${agentInst.instructions}`;
    }
  } catch (e) {
    console.error("[ScheduledTaskExecutor] Error loading custom instructions:", e);
  }

  try {
    const user = await storage.getUserById(userId);
    if (user) {
      systemPrompt += `\n\nKULLANICI BİLGİSİ:
- Ad Soyad: ${user.fullName || user.username}
- Şirket: ${user.company || "Belirtilmemiş"}
- E-posta: ${user.email}`;

      const members = await storage.getTeamMembers(userId);
      if (members.length > 0) {
        systemPrompt += `\n\nTAKIM ÜYELERİ:
${members.map(m => `- ${m.name} (${m.email})${m.position ? ` — ${m.position}` : ""}${m.department ? `, ${m.department}` : ""}`).join("\n")}`;
      }
    }
  } catch (e) {
    console.error("[ScheduledTaskExecutor] Error loading user context:", e);
  }

  systemPrompt += `\n\nÖNEMLİ: Bu görev kullanıcının önceden tanımladığı zamanlanmış otonom bir çalışmadır. Kısa, net ve kullanıcıya doğrudan faydalı bir rapor/sonuç üret. Gereksiz açıklama yapma.`;

  const response = await aiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: taskPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "Görev tamamlandı ancak sonuç boş döndü.";
}

async function sendTaskNotifications(
  task: ScheduledTask,
  result: string | null,
  durationMs: number,
  error: string | null
): Promise<void> {
  const isSuccess = !error;
  const agentDisplayName = getAgentDisplayName(task.agentType);

  if (task.notifyInApp) {
    try {
      const { notifyOwner } = await import("../bossNotificationService");
      await notifyOwner({
        userId: task.userId,
        type: isSuccess ? "scheduled_task_completed" : "scheduled_task_failed",
        teamMemberName: agentDisplayName,
        summary: isSuccess
          ? `Zamanlanmış görev tamamlandı: ${task.name}`
          : `Zamanlanmış görev başarısız oldu: ${task.name}`,
        details: {
          taskId: task.id,
          taskName: task.name,
          agentType: task.agentType,
          durationMs,
          ...(result && { result: result.substring(0, 500) }),
          ...(error && { error }),
        },
        skipEmail: !task.notifyEmail,
      });
    } catch (e) {
      console.error(`[ScheduledTaskExecutor] In-app notification failed for task ${task.id}:`, e);
    }
  } else if (task.notifyEmail) {
    try {
      const user = await storage.getUserById(task.userId);
      if (user?.email) {
        const { sendEmail } = await import("../emailService");
        const subject = isSuccess
          ? `[Zamanlanmış Görev] ${task.name} tamamlandı`
          : `[Zamanlanmış Görev] ${task.name} başarısız oldu`;

        const body = isSuccess
          ? `Zamanlanmış göreviniz başarıyla tamamlandı.\n\nGörev: ${task.name}\nAjan: ${agentDisplayName}\nSüre: ${Math.round(durationMs / 1000)} saniye\n\nSonuç:\n${(result || "").substring(0, 2000)}`
          : `Zamanlanmış göreviniz çalışırken bir hata oluştu.\n\nGörev: ${task.name}\nAjan: ${agentDisplayName}\nHata: ${error}`;

        await sendEmail({
          userId: task.userId,
          to: user.email,
          subject,
          body,
          agentType: task.agentType,
        });
      }
    } catch (e) {
      console.error(`[ScheduledTaskExecutor] Email-only notification failed for task ${task.id}:`, e);
    }
  }
}

function getAgentDisplayName(agentType: string): string {
  const names: Record<string, string> = {
    "customer-support": "Ava (Müşteri Destek)",
    "sales-sdr": "Rex (Satış)",
    "social-media": "Maya (Sosyal Medya)",
    "bookkeeping": "Finn (Muhasebe)",
    "scheduling": "Cal (Randevu)",
    "hr-recruiting": "Harper (İK)",
    "data-analyst": "DataBot (Veri Analiz)",
    "ecommerce-ops": "ShopBot (E-Ticaret)",
    "real-estate": "Reno (Gayrimenkul)",
    "manager": "Manager (Yönetici)",
  };
  return names[agentType] || agentType;
}
