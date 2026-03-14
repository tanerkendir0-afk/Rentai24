import { google } from "googleapis";
import { getOAuthGmailClient, isUserGmailOAuthConnected, getUserGmailAddress } from "./googleOAuth";

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function buildRawEmail(from: string, to: string, subject: string, body: string): string {
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(body, "utf-8").toString("base64"),
  ];
  const raw = lines.join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

export interface InboxEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}

export interface FullEmail {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: string;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || "";
}

function extractPlainTextBody(payload: any): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) return text;
    }
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = decodeBase64Url(payload.body.data);
    return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  }
  return "";
}

async function isUserGmailAppPasswordReady(userId: number): Promise<boolean> {
  const { storage } = await import("./storage");
  const user = await storage.getUserById(userId);
  return !!(user?.gmailAddress && user?.gmailAppPassword);
}

async function getAppPasswordGmailClient(userId: number): Promise<{ transporter: any; address: string } | null> {
  const { storage } = await import("./storage");
  const user = await storage.getUserById(userId);
  if (!user?.gmailAddress || !user?.gmailAppPassword) return null;
  const decrypted = storage.decryptGmailAppPassword(user.gmailAppPassword);
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: user.gmailAddress, pass: decrypted },
  });
  return { transporter, address: user.gmailAddress };
}

function isEnvGmailConfigured(): boolean {
  return !!(process.env.GMAIL_ADDRESS && process.env.GMAIL_APP_PASSWORD);
}

async function getEnvGmailClient(): Promise<{ transporter: any; address: string } | null> {
  const address = process.env.GMAIL_ADDRESS;
  const password = process.env.GMAIL_APP_PASSWORD;
  if (!address || !password) return null;
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: address, pass: password },
    });
    return { transporter, address };
  } catch {
    return null;
  }
}

export async function isUserGmailReady(userId: number): Promise<boolean> {
  const oauthReady = await isUserGmailOAuthConnected(userId);
  if (oauthReady) return true;
  const appPassReady = await isUserGmailAppPasswordReady(userId);
  if (appPassReady) return true;
  return isEnvGmailConfigured();
}

export async function getUserGmailStatus(userId: number): Promise<{ connected: boolean; email: string | null; method: string | null }> {
  const oauthConnected = await isUserGmailOAuthConnected(userId);
  if (oauthConnected) {
    const email = await getUserGmailAddress(userId);
    return { connected: true, email, method: "oauth" };
  }
  const appPassReady = await isUserGmailAppPasswordReady(userId);
  if (appPassReady) {
    const { storage } = await import("./storage");
    const user = await storage.getUserById(userId);
    return { connected: true, email: user?.gmailAddress || null, method: "app_password" };
  }
  if (isEnvGmailConfigured()) {
    return { connected: true, email: process.env.GMAIL_ADDRESS || null, method: "env" };
  }
  return { connected: false, email: null, method: null };
}

export async function listInbox(userId: number, maxResults: number = 10): Promise<{ success: boolean; emails?: InboxEmail[]; message: string }> {
  try {
    const gmail = await getOAuthGmailClient(userId);
    if (!gmail) {
      const appPassReady = await isUserGmailAppPasswordReady(userId);
      if (appPassReady) {
        return { success: false, message: "Your Gmail is connected via App Password, which supports **sending** emails only. To read your inbox, please connect via **Google OAuth** in **Settings** → Gmail Account → **Connect with Google**." };
      }
      return { success: false, message: "Gmail is not connected. Please go to **Settings** and click **Connect Gmail** to link your Google account." };
    }

    const list = await gmail.users.messages.list({
      userId: "me",
      maxResults,
      labelIds: ["INBOX"],
    });

    if (!list.data.messages || list.data.messages.length === 0) {
      return { success: true, emails: [], message: "Inbox is empty." };
    }

    const emails: InboxEmail[] = [];
    for (const msg of list.data.messages) {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const headers = (detail.data.payload?.headers || []) as Array<{ name: string; value: string }>;
      emails.push({
        id: msg.id!,
        threadId: detail.data.threadId || msg.id!,
        from: extractHeader(headers, "From"),
        subject: extractHeader(headers, "Subject"),
        snippet: detail.data.snippet || "",
        date: extractHeader(headers, "Date"),
      });
    }

    return { success: true, emails, message: `Found ${emails.length} emails in inbox.` };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Gmail listInbox error:", errMsg);
    return { success: false, message: `Failed to list inbox: ${errMsg}` };
  }
}

export async function readEmail(userId: number, messageId: string): Promise<{ success: boolean; email?: FullEmail; message: string }> {
  try {
    const gmail = await getOAuthGmailClient(userId);
    if (!gmail) {
      const appPassReady = await isUserGmailAppPasswordReady(userId);
      if (appPassReady) {
        return { success: false, message: "Your Gmail is connected via App Password, which supports **sending** emails only. To read emails, please connect via **Google OAuth** in **Settings** → Gmail Account → **Connect with Google**." };
      }
      return { success: false, message: "Gmail is not connected. Please go to **Settings** and click **Connect Gmail**." };
    }

    const detail = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const headers = (detail.data.payload?.headers || []) as Array<{ name: string; value: string }>;
    const body = extractPlainTextBody(detail.data.payload);

    const email: FullEmail = {
      id: messageId,
      threadId: detail.data.threadId || messageId,
      from: extractHeader(headers, "From"),
      to: extractHeader(headers, "To"),
      subject: extractHeader(headers, "Subject"),
      body: body || detail.data.snippet || "(no content)",
      date: extractHeader(headers, "Date"),
    };

    return { success: true, email, message: "Email retrieved successfully." };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Gmail readEmail error:", errMsg);
    return { success: false, message: `Failed to read email: ${errMsg}` };
  }
}

export async function replyToEmail(userId: number, messageId: string, body: string): Promise<{ success: boolean; message: string; replyMessageId?: string }> {
  try {
    const gmail = await getOAuthGmailClient(userId);
    if (!gmail) {
      const appPassReady = await isUserGmailAppPasswordReady(userId);
      if (appPassReady) {
        return { success: false, message: "Your Gmail is connected via App Password, which supports **sending** emails only. To reply to emails, please connect via **Google OAuth** in **Settings** → Gmail Account → **Connect with Google**." };
      }
      return { success: false, message: "Gmail is not connected. Please go to **Settings** and click **Connect Gmail**." };
    }

    const original = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Message-ID", "References", "In-Reply-To"],
    });

    const headers = (original.data.payload?.headers || []) as Array<{ name: string; value: string }>;
    const originalFromRaw = extractHeader(headers, "From");
    const originalSubject = extractHeader(headers, "Subject");
    const originalMessageId = extractHeader(headers, "Message-ID");
    const existingReferences = extractHeader(headers, "References");
    const threadId = original.data.threadId || messageId;

    const emailMatch = originalFromRaw.match(/<([^>]+)>/);
    const replyTo = emailMatch ? emailMatch[1] : originalFromRaw;

    let myAddress = "me";
    try {
      const profile = await gmail.users.getProfile({ userId: "me" });
      myAddress = profile.data.emailAddress || myAddress;
    } catch {}

    const replySubject = originalSubject.startsWith("Re:") ? originalSubject : `Re: ${originalSubject}`;
    const references = existingReferences
      ? `${existingReferences} ${originalMessageId}`
      : originalMessageId;

    const rawLines = [
      `From: ${myAddress}`,
      `To: ${replyTo}`,
      `Subject: ${encodeSubject(replySubject)}`,
      `In-Reply-To: ${originalMessageId}`,
      `References: ${references}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Buffer.from(body, "utf-8").toString("base64"),
    ];
    const raw = Buffer.from(rawLines.join("\r\n")).toString("base64url");

    const result = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId },
    });

    return {
      success: true,
      message: `Reply sent to ${replyTo} in thread "${replySubject}"`,
      replyMessageId: result.data.id || undefined,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Gmail replyToEmail error:", errMsg);
    return { success: false, message: `Failed to reply: ${errMsg}` };
  }
}

export async function sendViaGmail(userId: number, params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; message: string; messageId?: string; fromAddress?: string }> {
  try {
    const gmail = await getOAuthGmailClient(userId);
    if (gmail) {
      let fromAddress = "me";
      try {
        const profile = await gmail.users.getProfile({ userId: "me" });
        fromAddress = profile.data.emailAddress || fromAddress;
      } catch {}

      const raw = buildRawEmail(fromAddress, params.to, params.subject, params.body);

      const result = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      return {
        success: true,
        message: `Email sent from your Gmail (${fromAddress}) to ${params.to} with subject "${params.subject}"`,
        messageId: result.data.id || undefined,
        fromAddress,
      };
    }

    const appPassClient = await getAppPasswordGmailClient(userId);
    if (appPassClient) {
      await appPassClient.transporter.sendMail({
        from: appPassClient.address,
        to: params.to,
        subject: params.subject,
        text: params.body,
      });
      return {
        success: true,
        message: `Email sent from your Gmail (${appPassClient.address}) to ${params.to} with subject "${params.subject}"`,
        fromAddress: appPassClient.address,
      };
    }

    const envClient = await getEnvGmailClient();
    if (envClient) {
      await envClient.transporter.sendMail({
        from: envClient.address,
        to: params.to,
        subject: params.subject,
        text: params.body,
      });
      return {
        success: true,
        message: `Email sent from platform Gmail (${envClient.address}) to ${params.to} with subject "${params.subject}"`,
        fromAddress: envClient.address,
      };
    }

    return { success: false, message: "Gmail is not connected. Please go to Settings to connect your Gmail via Google OAuth or App Password." };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Gmail send error:", errMsg);
    return { success: false, message: `Gmail send failed: ${errMsg}` };
  }
}
