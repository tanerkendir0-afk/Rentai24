import { storage } from "./storage";
import type { InsertBossNotification } from "@shared/schema";
import OpenAI from "openai";

const aiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateOwnerResponse(params: {
  type: string;
  teamMemberName: string;
  summary: string;
  details?: Record<string, any>;
}): Promise<string> {
  try {
    const response = await aiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a concise executive assistant. Summarize agent activity notifications in 1-2 sentences for the account owner. Be professional and action-oriented. If the action seems routine, acknowledge it briefly. If it seems important or unusual, flag it.",
        },
        {
          role: "user",
          content: `Agent action notification:\nType: ${params.type}\nAgent: ${params.teamMemberName}\nSummary: ${params.summary}${params.details ? `\nDetails: ${JSON.stringify(params.details)}` : ""}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });
    return response.choices[0]?.message?.content || "Notification processed.";
  } catch (error) {
    console.error("[Notification] GPT summarization failed:", error);
    return `${params.teamMemberName} performed ${params.type}: ${params.summary}`;
  }
}

export async function notifyOwner(params: {
  userId: number;
  type: string;
  teamMemberName: string;
  summary: string;
  details?: Record<string, any>;
  skipEmail?: boolean;
}): Promise<void> {
  const ownerResponse = await generateOwnerResponse(params);

  const notification: InsertBossNotification = {
    userId: params.userId,
    type: params.type,
    teamMemberName: params.teamMemberName,
    summary: params.summary,
    details: params.details || null,
    bossResponse: ownerResponse,
    adminNotified: false,
  };

  const created = await storage.createOwnerNotification(notification);

  let emailSent = false;
  if (!params.skipEmail) {
    try {
      const user = await storage.getUserById(params.userId);
      if (user?.email) {
        const { sendEmail } = await import("./emailService");

        const emailBody = `RentAI 24 Bildirim\n\nTür: ${params.type}\nAjan: ${params.teamMemberName}\n\nÖzet:\n${params.summary}\n\nBildirim Değerlendirmesi:\n${ownerResponse}\n\n${params.details ? `Detaylar:\n${JSON.stringify(params.details, null, 2)}` : ""}\n\n---\nBu bildirim RentAI 24 tarafından oluşturulmuştur.`;

        await sendEmail({
          to: user.email,
          subject: `[RentAI 24 Bildirim] ${params.type}: ${params.teamMemberName} - ${params.summary.substring(0, 50)}`,
          body: emailBody,
          userId: params.userId,
          agentType: "notification",
        });
        emailSent = true;
      }
    } catch (emailError) {
      console.error("[Notification] Email notification failed (notification still saved):", emailError);
    }
  }

  if (emailSent && created.id) {
    try {
      await storage.markOwnerNotificationNotified(created.id);
    } catch (e) {
      console.error("[Notification] Failed to update adminNotified flag:", e);
    }
  }

  // Send push notification to mobile app
  try {
    const { sendPushToUser } = await import("./pushNotificationService");
    await sendPushToUser(
      params.userId,
      `${params.teamMemberName} - ${params.type}`,
      ownerResponse,
      { type: params.type, notificationId: created.id },
    );
  } catch (pushError) {
    console.error("[Notification] Push notification failed (non-fatal):", pushError);
  }

  console.log(`[Notification] Notification created for user ${params.userId}: ${params.type} - ${params.teamMemberName}${emailSent ? " (email sent)" : ""}`);
}

export async function notifyBoss(params: {
  userId: number;
  type: string;
  teamMemberName: string;
  summary: string;
  details?: Record<string, any>;
}): Promise<void> {
  return notifyOwner(params);
}

export async function triggerEmailReplyNotification(params: {
  userId: number;
  agentType: string;
  teamMemberName: string;
  recipientEmail: string;
  subject: string;
  replySnippet: string;
}): Promise<void> {
  await notifyOwner({
    userId: params.userId,
    type: "email_reply",
    teamMemberName: params.teamMemberName,
    summary: `${params.teamMemberName} replied to an email from ${params.recipientEmail} regarding "${params.subject}"`,
    details: {
      agentType: params.agentType,
      recipient: params.recipientEmail,
      subject: params.subject,
      replySnippet: params.replySnippet.substring(0, 200),
    },
  });
}

export async function triggerEmailSentNotification(params: {
  userId: number;
  agentType: string;
  teamMemberName: string;
  recipientEmail: string;
  subject: string;
  bodySnippet: string;
}): Promise<void> {
  await notifyOwner({
    userId: params.userId,
    type: "email_sent",
    teamMemberName: params.teamMemberName,
    summary: `${params.teamMemberName} sent an email to ${params.recipientEmail}: "${params.subject}"`,
    details: {
      agentType: params.agentType,
      recipient: params.recipientEmail,
      subject: params.subject,
      bodySnippet: params.bodySnippet.substring(0, 200),
    },
  });
}

export async function triggerTaskCompleteNotification(params: {
  userId: number;
  agentType: string;
  teamMemberName: string;
  taskDescription: string;
  result: string;
}): Promise<void> {
  await notifyOwner({
    userId: params.userId,
    type: "task_completed",
    teamMemberName: params.teamMemberName,
    summary: `${params.teamMemberName} completed task: ${params.taskDescription}`,
    details: {
      agentType: params.agentType,
      task: params.taskDescription,
      result: params.result.substring(0, 500),
    },
  });
}

export async function createBossNotification(
  userId: number,
  summary: string,
  type: string
): Promise<void> {
  await notifyOwner({
    userId,
    type,
    teamMemberName: "System",
    summary,
  });
}

export { createBossNotification as createOwnerNotification };
