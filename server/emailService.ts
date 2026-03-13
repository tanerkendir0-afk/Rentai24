import { Resend } from "resend";
import { storage } from "./storage";
import { isGmailConnected, sendViaGmail } from "./gmailService";

let resendConnectionSettings: Record<string, string> | null = null;
let gmailDisabledByUser = false;

export function setGmailDisabled(disabled: boolean) {
  gmailDisabledByUser = disabled;
}

export function isGmailDisabledByUser(): boolean {
  return gmailDisabledByUser;
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

async function sendViaResend(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; message: string; resendId?: string }> {
  const { client, fromEmail } = await getResendClient();

  const result = await client.emails.send({
    from: fromEmail,
    to: [params.to],
    subject: params.subject,
    text: params.body,
  });

  if (result.error) {
    return { success: false, message: `Failed to send email to ${params.to}: ${result.error.message}` };
  }

  return {
    success: true,
    message: `Email sent to ${params.to} with subject "${params.subject}" (via platform email)`,
    resendId: result.data?.id,
  };
}

export async function sendEmail(params: {
  userId: number;
  to: string;
  subject: string;
  body: string;
  agentType: string;
}): Promise<{ success: boolean; message: string; provider?: string }> {
  try {
    const gmailAvailable = !gmailDisabledByUser && await isGmailConnected();

    if (gmailAvailable) {
      const gmailResult = await sendViaGmail({
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

      console.error("Gmail failed, falling back to platform email:", gmailResult.message);
    }

    const resendResult = await sendViaResend({
      to: params.to,
      subject: params.subject,
      body: params.body,
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

export async function getEmailStatus(): Promise<{ provider: string; address: string | null; connected: boolean }> {
  if (gmailDisabledByUser) {
    return { provider: "platform", address: null, connected: true };
  }
  const gmailConnected = await isGmailConnected();
  if (gmailConnected) {
    const { getGmailAddress } = await import("./gmailService");
    const address = await getGmailAddress();
    return { provider: "gmail", address, connected: true };
  }
  return { provider: "platform", address: null, connected: true };
}
