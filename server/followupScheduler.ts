import { sendEmail } from "./emailService";
import { storage } from "./storage";

interface ScheduledFollowup {
  id: number;
  userId: number;
  agentType: string;
  to: string;
  subject: string;
  body: string;
  sendAt: Date;
  timer: ReturnType<typeof setTimeout>;
}

let nextId = 1;
const scheduledFollowups: Map<number, ScheduledFollowup> = new Map();

export function scheduleFollowup(params: {
  userId: number;
  agentType: string;
  to: string;
  subject: string;
  body: string;
  delayDays: number;
}): { followupId: number; sendAt: Date } {
  const delayDays = Math.min(Math.max(params.delayDays, 1), 30);
  const sendAt = new Date();
  sendAt.setDate(sendAt.getDate() + delayDays);
  const delayMs = delayDays * 24 * 60 * 60 * 1000;

  const followupId = nextId++;

  const timer = setTimeout(async () => {
    try {
      const result = await sendEmail({
        userId: params.userId,
        to: params.to,
        subject: params.subject,
        body: params.body,
        agentType: params.agentType,
      });

      await storage.createAgentAction({
        userId: params.userId,
        agentType: params.agentType,
        actionType: "followup_sent",
        description: `Scheduled follow-up delivered to ${params.to}: "${params.subject}" (${result.success ? "sent" : "failed"})`,
        metadata: { followupId, to: params.to, subject: params.subject, success: result.success },
      });

      console.log(`Follow-up #${followupId} ${result.success ? "sent" : "failed"}: ${params.to}`);
    } catch (err) {
      console.error(`Follow-up #${followupId} error:`, err);
    } finally {
      scheduledFollowups.delete(followupId);
    }
  }, delayMs);

  scheduledFollowups.set(followupId, {
    id: followupId,
    userId: params.userId,
    agentType: params.agentType,
    to: params.to,
    subject: params.subject,
    body: params.body,
    sendAt,
    timer,
  });

  console.log(`Follow-up #${followupId} scheduled for ${sendAt.toISOString()} to ${params.to}`);

  return { followupId, sendAt };
}

export function getScheduledFollowups(userId: number): Array<{ id: number; to: string; subject: string; sendAt: Date }> {
  const results: Array<{ id: number; to: string; subject: string; sendAt: Date }> = [];
  for (const followup of scheduledFollowups.values()) {
    if (followup.userId === userId) {
      results.push({ id: followup.id, to: followup.to, subject: followup.subject, sendAt: followup.sendAt });
    }
  }
  return results;
}

export function cancelFollowup(followupId: number, userId: number): boolean {
  const followup = scheduledFollowups.get(followupId);
  if (!followup || followup.userId !== userId) return false;
  clearTimeout(followup.timer);
  scheduledFollowups.delete(followupId);
  return true;
}
