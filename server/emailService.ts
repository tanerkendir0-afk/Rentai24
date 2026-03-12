import { Resend } from "resend";
import { storage } from "./storage";

let connectionSettings: Record<string, string> | null = null;

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
  connectionSettings = data.items?.[0]?.settings;

  if (!connectionSettings || !connectionSettings.api_key) {
    throw new Error("Resend not connected");
  }

  return { apiKey: connectionSettings.api_key, fromEmail: connectionSettings.from_email || "onboarding@resend.dev" };
}

async function getResendClient(): Promise<{ client: Resend; fromEmail: string }> {
  const { apiKey, fromEmail } = await getResendCredentials();
  return { client: new Resend(apiKey), fromEmail };
}

export async function sendEmail(params: {
  userId: number;
  to: string;
  subject: string;
  body: string;
  agentType: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const { client, fromEmail } = await getResendClient();

    const result = await client.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: params.subject,
      text: params.body,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      await storage.createAgentAction({
        userId: params.userId,
        agentType: params.agentType,
        actionType: "email_failed",
        description: `Failed to send email to ${params.to}: ${result.error.message}`,
        metadata: { to: params.to, subject: params.subject, error: result.error.message },
      });
      return { success: false, message: `Failed to send email to ${params.to}: ${result.error.message}` };
    }

    await storage.createAgentAction({
      userId: params.userId,
      agentType: params.agentType,
      actionType: "email_sent",
      description: `Email sent to ${params.to}: "${params.subject}"`,
      metadata: { to: params.to, subject: params.subject, body: params.body, resendId: result.data?.id },
    });

    return { success: true, message: `Email successfully sent to ${params.to} with subject "${params.subject}"` };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Email send error:", errMsg);
    return { success: false, message: `Failed to send email: ${errMsg}` };
  }
}
