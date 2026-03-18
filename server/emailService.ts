import { Resend } from "resend";
import { storage } from "./storage";
import { isUserGmailReady, sendViaGmail, getUserGmailStatus } from "./gmailService";

let resendConnectionSettings: Record<string, string> | null = null;

const GMAIL_DISABLED_KEY = "gmail_disabled";

export async function setGmailDisabled(disabled: boolean, userId?: number): Promise<void> {
  const key = userId ? `${GMAIL_DISABLED_KEY}_${userId}` : GMAIL_DISABLED_KEY;
  await storage.setSystemSetting(key, disabled ? "true" : "false");
}

export async function isGmailDisabledByUser(userId?: number): Promise<boolean> {
  const key = userId ? `${GMAIL_DISABLED_KEY}_${userId}` : GMAIL_DISABLED_KEY;
  const value = await storage.getSystemSetting(key);
  if (value !== null) return value === "true";
  if (userId) {
    const globalValue = await storage.getSystemSetting(GMAIL_DISABLED_KEY);
    return globalValue === "true";
  }
  return false;
}

async function getResendCredentials(): Promise<{ apiKey: string; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const response = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  );
  const data = await response.json();
  resendConnectionSettings = data.items?.[0]?.settings;

  if (!resendConnectionSettings || !resendConnectionSettings.api_key) {
    throw new Error("Resend not connected");
  }

  return { apiKey: resendConnectionSettings.api_key, fromEmail: resendConnectionSettings.from_email || "onboarding@resend.dev" };
}

async function getResendClient(): Promise<{ client: Resend; fromEmail: string }> {
  const { apiKey, fromEmail } = await getResendCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

function sanitizeUrl(url: string): string {
  return url.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function markdownToHtml(text: string): string {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/`(.+?)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px;">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="color:#1a1a2e;margin:16px 0 8px;font-size:16px;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="color:#1a1a2e;margin:20px 0 10px;font-size:18px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="color:#1a1a2e;margin:24px 0 12px;font-size:22px;">$1</h1>');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/(https?:\/\/[^\s&<]+)/g, (match) => `<a href="${sanitizeUrl(match)}" style="color:#3b82f6;text-decoration:underline;">${match}</a>`);
  html = html.replace(/\n{2,}/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, "");
  return html;
}

function buildEmailHtml(body: string, agentType?: string): string {
  const agentColors: Record<string, { primary: string; name: string }> = {
    "customer-support": { primary: "#6366f1", name: "Ava — Customer Support" },
    "sales-sdr": { primary: "#3b82f6", name: "Rex — Sales SDR" },
    "social-media": { primary: "#ec4899", name: "Maya — Social Media" },
    "bookkeeping": { primary: "#f59e0b", name: "Finn — Bookkeeping" },
    "scheduling": { primary: "#14b8a6", name: "Cal — Scheduling" },
    "hr-recruiting": { primary: "#8b5cf6", name: "Harper — HR & Recruiting" },
    "data-analyst": { primary: "#06b6d4", name: "DataBot — Data Analyst" },
    "ecommerce-ops": { primary: "#f97316", name: "ShopBot — E-Commerce" },
    "real-estate": { primary: "#22c55e", name: "Reno — Real Estate" },
  };

  const agent = agentColors[agentType || ""] || { primary: "#3b82f6", name: "RentAI 24" };
  const htmlBody = markdownToHtml(body);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:100%;">
<tr><td style="background:${agent.primary};padding:20px 32px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="color:#ffffff;font-size:20px;font-weight:700;">RentAI 24</td>
<td align="right" style="color:rgba(255,255,255,0.85);font-size:13px;">${agent.name}</td></tr>
</table>
</td></tr>
<tr><td style="padding:32px;color:#333;font-size:15px;line-height:1.7;">${htmlBody}</td></tr>
<tr><td style="padding:0 32px 24px;">
<hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
<p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">
Bu e-posta <strong>RentAI 24</strong> AI platformu aracılığıyla gönderilmiştir.<br>
<a href="https://rentai24.com" style="color:${agent.primary};text-decoration:none;">rentai24.com</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

interface EmailAttachment {
  filename: string;
  content_base64: string;
  content_type: string;
}

async function sendViaResend(params: {
  to: string;
  subject: string;
  body: string;
  agentType?: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; message: string; resendId?: string }> {
  const { client, fromEmail } = await getResendClient();

  const htmlContent = params.htmlBody || buildEmailHtml(params.body, params.agentType);

  const emailPayload: any = {
    from: fromEmail,
    to: [params.to],
    subject: params.subject,
    html: htmlContent,
    text: params.body,
  };

  if (params.attachments && params.attachments.length > 0) {
    emailPayload.attachments = params.attachments.map(att => ({
      filename: att.filename,
      content: Buffer.from(att.content_base64, "base64"),
      content_type: att.content_type,
    }));
  }

  const result = await client.emails.send(emailPayload);

  if (result.error) {
    return { success: false, message: `Failed to send email to ${params.to}: ${result.error.message}` };
  }

  const attachmentInfo = params.attachments?.length ? ` (${params.attachments.length} attachment)` : "";
  return {
    success: true,
    message: `Email sent to ${params.to} with subject "${params.subject}"${attachmentInfo} (via platform email)`,
    resendId: result.data?.id,
  };
}

export async function sendEmail(params: {
  userId: number;
  to: string;
  subject: string;
  body: string;
  agentType: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
}): Promise<{ success: boolean; message: string; provider?: string }> {
  try {
    const disabled = await isGmailDisabledByUser(params.userId);
    const hasAttachments = params.attachments && params.attachments.length > 0;

    if (!disabled && !hasAttachments) {
      const gmailReady = await isUserGmailReady(params.userId);
      if (gmailReady) {
        const gmailResult = await sendViaGmail(params.userId, {
          to: params.to,
          subject: params.subject,
          body: params.body,
        });

        if (gmailResult.success) {
          await storage.createAgentAction({
            userId: params.userId,
            agentType: params.agentType,
            actionType: "email_sent",
            description: `Email sent from Gmail (${gmailResult.fromAddress}) to ${params.to}: "${params.subject}"`,
            metadata: { to: params.to, subject: params.subject, body: params.body, provider: "gmail", gmailMessageId: gmailResult.messageId, fromAddress: gmailResult.fromAddress },
          });
          return { success: true, message: gmailResult.message, provider: "gmail" };
        }

        console.error("Gmail OAuth send failed, falling back to platform email:", gmailResult.message);
      }
    }

    const resendResult = await sendViaResend({
      to: params.to,
      subject: params.subject,
      body: params.body,
      agentType: params.agentType,
      htmlBody: params.htmlBody,
      attachments: params.attachments,
    });

    if (!resendResult.success) {
      await storage.createAgentAction({
        userId: params.userId,
        agentType: params.agentType,
        actionType: "email_failed",
        description: `Failed to send email to ${params.to}: ${resendResult.message}`,
        metadata: { to: params.to, subject: params.subject, error: resendResult.message },
      });
      return { success: false, message: resendResult.message };
    }

    await storage.createAgentAction({
      userId: params.userId,
      agentType: params.agentType,
      actionType: "email_sent",
      description: `Email sent to ${params.to}: "${params.subject}" (via platform email)`,
      metadata: { to: params.to, subject: params.subject, body: params.body, provider: "resend", resendId: resendResult.resendId },
    });

    return { success: true, message: resendResult.message, provider: "resend" };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Email send error:", errMsg);
    return { success: false, message: `Failed to send email: ${errMsg}` };
  }
}

export async function sendViaResendDirect(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sendViaResend(params);
    return result;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, message: errMsg };
  }
}

export async function getEmailStatus(userId?: number): Promise<{ provider: string; address: string | null; connected: boolean; canRead?: boolean; canSend?: boolean }> {
  const disabled = await isGmailDisabledByUser(userId);
  if (disabled) {
    return { provider: "platform", address: null, connected: true };
  }

  if (userId) {
    const gmailStatus = await getUserGmailStatus(userId);
    if (gmailStatus.connected) {
      const canRead = gmailStatus.method === "oauth";
      return {
        provider: "gmail",
        address: gmailStatus.email,
        connected: true,
        canRead,
        canSend: true,
      };
    }
  }

  return { provider: "platform", address: null, connected: true };
}
