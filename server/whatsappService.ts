import { storage } from "./storage";
import crypto from "crypto";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

interface WhatsappSendResult {
  success: boolean;
  message: string;
  whatsappMessageId?: string;
}

export async function getWhatsappStatus(userId: number): Promise<{
  connected: boolean;
  phoneNumberId: string | null;
  displayName: string | null;
}> {
  const config = await storage.getWhatsappConfig(userId);
  if (!config || config.status !== "active") {
    return { connected: false, phoneNumberId: null, displayName: null };
  }
  return {
    connected: true,
    phoneNumberId: config.phoneNumberId,
    displayName: config.displayName,
  };
}

export async function sendTextMessage(
  userId: number,
  to: string,
  message: string,
  agentType?: string,
): Promise<WhatsappSendResult> {
  const config = await storage.getWhatsappConfig(userId);
  if (!config || config.status !== "active") {
    return { success: false, message: "WhatsApp is not configured. Please connect your WhatsApp Business account in Settings." };
  }

  const phone = normalizePhone(to);

  try {
    const response = await fetch(`${GRAPH_API_BASE}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { body: message },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data?.error?.message || "Unknown WhatsApp API error";
      console.error("[WhatsApp] Send failed:", errMsg);
      await storage.saveWhatsappMessage({
        userId,
        agentType: agentType || null,
        direction: "outbound",
        customerPhone: phone,
        messageType: "text",
        content: message,
        status: "failed",
      });
      return { success: false, message: `WhatsApp send failed: ${errMsg}` };
    }

    const waMessageId = data?.messages?.[0]?.id || null;
    await storage.saveWhatsappMessage({
      userId,
      agentType: agentType || null,
      direction: "outbound",
      customerPhone: phone,
      messageType: "text",
      content: message,
      whatsappMessageId: waMessageId,
      status: "sent",
    });

    return {
      success: true,
      message: `WhatsApp message sent to ${phone}`,
      whatsappMessageId: waMessageId,
    };
  } catch (error: any) {
    console.error("[WhatsApp] Network error:", error.message);
    return { success: false, message: `WhatsApp send error: ${error.message}` };
  }
}

export async function sendTemplateMessage(
  userId: number,
  to: string,
  templateName: string,
  languageCode: string = "en",
  parameters?: Array<{ type: string; text: string }>,
  agentType?: string,
): Promise<WhatsappSendResult> {
  const config = await storage.getWhatsappConfig(userId);
  if (!config || config.status !== "active") {
    return { success: false, message: "WhatsApp is not configured. Please connect your WhatsApp Business account in Settings." };
  }

  const phone = normalizePhone(to);
  const components: any[] = [];
  if (parameters && parameters.length > 0) {
    components.push({
      type: "body",
      parameters: parameters.map(p => ({ type: "text", text: p.text })),
    });
  }

  try {
    const response = await fetch(`${GRAPH_API_BASE}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data?.error?.message || "Unknown WhatsApp API error";
      console.error("[WhatsApp] Template send failed:", errMsg);
      return { success: false, message: `WhatsApp template send failed: ${errMsg}` };
    }

    const waMessageId = data?.messages?.[0]?.id || null;
    await storage.saveWhatsappMessage({
      userId,
      agentType: agentType || null,
      direction: "outbound",
      customerPhone: phone,
      messageType: "template",
      content: `[Template: ${templateName}]`,
      templateName,
      whatsappMessageId: waMessageId,
      status: "sent",
    });

    return {
      success: true,
      message: `WhatsApp template "${templateName}" sent to ${phone}`,
      whatsappMessageId: waMessageId,
    };
  } catch (error: any) {
    console.error("[WhatsApp] Template error:", error.message);
    return { success: false, message: `WhatsApp template error: ${error.message}` };
  }
}

export async function markAsRead(userId: number, messageId: string): Promise<boolean> {
  const config = await storage.getWhatsappConfig(userId);
  if (!config) return false;

  try {
    await fetch(`${GRAPH_API_BASE}/${config.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function processIncomingWebhook(body: any): Promise<void> {
  const entries = body?.entry;
  if (!Array.isArray(entries)) return;

  for (const entry of entries) {
    const changes = entry?.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      if (change.field !== "messages") continue;
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const config = await storage.getWhatsappConfigByPhoneNumberId(phoneNumberId);
      if (!config) {
        console.warn("[WhatsApp] No config found for phone_number_id:", phoneNumberId);
        continue;
      }

      if (value.statuses) {
        for (const status of value.statuses) {
          if (status.id && status.status) {
            await storage.updateWhatsappMessageStatus(status.id, status.status);
          }
        }
      }

      if (value.messages) {
        for (const msg of value.messages) {
          const contactName = value.contacts?.[0]?.profile?.name || null;
          const content = msg.type === "text" ? msg.text?.body || "" : `[${msg.type}]`;

          await storage.saveWhatsappMessage({
            userId: config.userId,
            direction: "inbound",
            customerPhone: msg.from,
            customerName: contactName,
            messageType: msg.type === "text" ? "text" : (msg.type === "image" ? "image" : "document"),
            content,
            whatsappMessageId: msg.id,
            status: "received",
          });

          try {
            await markAsRead(config.userId, msg.id);
          } catch {}

          try {
            const { createBossNotification } = await import("./bossNotificationService");
            const summary = `📱 New WhatsApp message from ${contactName || msg.from}: ${content.length > 150 ? content.slice(0, 150) + "..." : content}`;
            await createBossNotification(config.userId, summary, "task_completed");
          } catch (e) {
            console.error("[WhatsApp] Boss notification error:", e);
          }
        }
      }
    }
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string, appSecret: string): boolean {
  const expectedSig = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return `sha256=${expectedSig}` === signature;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "90" + cleaned.slice(1);
  }
  return cleaned;
}
