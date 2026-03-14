import { Resend } from "resend";
import { storage } from "./storage";
import { clearGmailConnectionCache } from "./gmailService";
import * as nodemailer from "nodemailer";

let resendConnectionSettings: Record<string, string> | null = null;

const GMAIL_DISABLED_KEY = "gmail_disabled";

export async function setGmailDisabled(disabled: boolean, userId?: number): Promise<void> {
  const key = userId ? `${GMAIL_DISABLED_KEY}_${userId}` : GMAIL_DISABLED_KEY;
  await storage.setSystemSetting(key, disabled ? "true" : "false");
  if (disabled) {
    clearGmailConnectionCache();
  }
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

async function sendViaUserSmtp(params: {
  to: string;
  subject: string;
  body: string;
  gmailAddress: string;
  gmailAppPassword: string;
}): Promise<{ success: boolean; message: string; fromAddress: string }> {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: params.gmailAddress,
      pass: params.gmailAppPassword,
    },
  });

  await transporter.sendMail({
    from: params.gmailAddress,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  return {
    success: true,
    message: `Email sent from your Gmail (${params.gmailAddress}) to ${params.to} with subject "${params.subject}"`,
    fromAddress: params.gmailAddress,
  };
}

async function getUserGmailCredentials(userId: number): Promise<{ gmailAddress: string; gmailAppPassword: string } | null> {
  const user = await storage.getUserById(userId);
  if (!user?.gmailAddress || !user?.gmailAppPassword) return null;
  const decryptedPassword = storage.decryptGmailAppPassword(user.gmailAppPassword);
  return { gmailAddress: user.gmailAddress, gmailAppPassword: decryptedPassword };
}

export async function sendEmail(params: {
  userId: number;
  to: string;
  subject: string;
  body: string;
  agentType: string;
}): Promise<{ success: boolean; message: string; provider?: string }> {
  try {
    const disabled = await isGmailDisabledByUser(params.userId);

    if (!disabled) {
      const userCreds = await getUserGmailCredentials(params.userId);
      if (userCreds) {
        try {
          const smtpResult = await sendViaUserSmtp({
            to: params.to,
            subject: params.subject,
            body: params.body,
            gmailAddress: userCreds.gmailAddress,
            gmailAppPassword: userCreds.gmailAppPassword,
          });

          if (smtpResult.success) {
            await storage.createAgentAction({
              userId: params.userId,
              agentType: params.agentType,
              actionType: "email_sent",
              description: `Email sent from user Gmail (${smtpResult.fromAddress}) to ${params.to}: "${params.subject}"`,
              metadata: { to: params.to, subject: params.subject, body: params.body, provider: "gmail", fromAddress: smtpResult.fromAddress },
            });
            return { success: true, message: smtpResult.message, provider: "gmail" };
          }
        } catch (smtpErr: unknown) {
          const smtpErrMsg = smtpErr instanceof Error ? smtpErr.message : String(smtpErr);
          console.error(`User Gmail SMTP failed for userId ${params.userId}, falling back to platform email:`, smtpErrMsg);
        }
      }
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

export async function getEmailStatus(userId?: number): Promise<{ provider: string; address: string | null; connected: boolean; canRead?: boolean; canSend?: boolean }> {
  const disabled = await isGmailDisabledByUser(userId);
  if (disabled) {
    return { provider: "platform", address: null, connected: true };
  }

  if (userId) {
    const userCreds = await getUserGmailCredentials(userId);
    if (userCreds) {
      return {
        provider: "gmail",
        address: userCreds.gmailAddress,
        connected: true,
        canRead: true,
        canSend: true,
      };
    }
  }

  return { provider: "platform", address: null, connected: true };
}
