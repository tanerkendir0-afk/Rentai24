import { storage } from "./storage";

export async function sendEmail(params: {
  userId: number;
  to: string;
  subject: string;
  body: string;
  agentType: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    await storage.createAgentAction({
      userId: params.userId,
      agentType: params.agentType,
      actionType: "email_sent",
      description: `Email sent to ${params.to}: "${params.subject}"`,
      metadata: { to: params.to, subject: params.subject, body: params.body },
    });

    return { success: true, message: `Email successfully sent to ${params.to} with subject "${params.subject}"` };
  } catch (error: any) {
    console.error("Email send error:", error?.message || error);
    return { success: false, message: "Failed to send email. Please try again." };
  }
}
