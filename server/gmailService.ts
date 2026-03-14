import { google } from "googleapis";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

interface GmailConnectionSettings {
  settings: {
    access_token?: string;
    expires_at?: string;
    oauth?: { credentials?: { access_token?: string } };
  };
}

let connectionSettings: GmailConnectionSettings | null = null;

export function clearGmailConnectionCache() {
  connectionSettings = null;
}

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

async function fetchFreshToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("Gmail authentication token not available");
  }

  const response = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=google-mail",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  );
  const data = await response.json();
  connectionSettings = data.items?.[0];

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Gmail not connected");
  }
  return accessToken;
}

async function getAccessToken(forceRefresh = false): Promise<string> {
  if (
    !forceRefresh &&
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now() + TOKEN_EXPIRY_BUFFER_MS
  ) {
    const cachedToken =
      connectionSettings.settings.access_token ||
      connectionSettings.settings.oauth?.credentials?.access_token;
    if (cachedToken) return cachedToken;
  }

  connectionSettings = null;
  return fetchFreshToken();
}

function getGmailClient() {
  return getAccessToken().then((accessToken) => {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.gmail({ version: "v1", auth: oauth2Client });
  });
}

export async function isGmailConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function verifyGmailConnection(): Promise<{ valid: boolean; address: string | null; canRead: boolean; canSend: boolean }> {
  try {
    const gmail = await getGmailClient();
    let address: string | null = process.env.GMAIL_ADDRESS || null;
    let canRead = isImapConfigured();
    const canSend = true;

    try {
      const profile = await gmail.users.getProfile({ userId: "me" });
      address = profile.data.emailAddress || address;
    } catch {}

    try {
      await gmail.users.messages.list({ userId: "me", maxResults: 1 });
      canRead = true;
    } catch {}

    return { valid: true, address, canRead, canSend };
  } catch {
    if (isImapConfigured()) {
      return { valid: true, address: process.env.GMAIL_ADDRESS || null, canRead: true, canSend: false };
    }
    return { valid: false, address: null, canRead: false, canSend: false };
  }
}

export async function getGmailAddress(): Promise<string | null> {
  try {
    const gmail = await getGmailClient();
    try {
      const profile = await gmail.users.getProfile({ userId: "me" });
      return profile.data.emailAddress || null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

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

export interface UserGmailCredentials {
  gmailAddress: string;
  gmailAppPassword: string;
}

export function getUserGmailInfo(userCreds: UserGmailCredentials | null): { email: string; hasCredentials: boolean } | null {
  if (!userCreds) return null;
  return { email: userCreds.gmailAddress, hasCredentials: !!(userCreds.gmailAddress && userCreds.gmailAppPassword) };
}

function getImapCredentials(userCreds?: UserGmailCredentials | null): { user: string; pass: string } | null {
  if (userCreds) {
    return { user: userCreds.gmailAddress, pass: userCreds.gmailAppPassword };
  }
  const user = process.env.GMAIL_ADDRESS;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return { user, pass };
}

export function isImapConfigured(userCreds?: UserGmailCredentials | null): boolean {
  return !!getImapCredentials(userCreds);
}

async function getImapClient(userCreds?: UserGmailCredentials | null): Promise<ImapFlow> {
  const creds = getImapCredentials(userCreds);
  if (!creds) throw new Error("IMAP not configured");
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: creds.user, pass: creds.pass },
    logger: false,
  });
  await client.connect();
  return client;
}

const IMAP_ID_PREFIX = "imap_";

async function listInboxViaImap(maxResults: number, userCreds?: UserGmailCredentials | null): Promise<{ success: boolean; emails?: InboxEmail[]; message: string }> {
  let client: ImapFlow | null = null;
  try {
    client = await getImapClient(userCreds);
    const lock = await client.getMailboxLock("INBOX");
    try {
      const total = client.mailbox?.exists || 0;
      if (total === 0) {
        return { success: true, emails: [], message: "Inbox is empty." };
      }
      const startSeq = Math.max(1, total - maxResults + 1);
      const emails: InboxEmail[] = [];
      for await (const msg of client.fetch(`${startSeq}:*`, { envelope: true, uid: true })) {
        const env = msg.envelope;
        emails.push({
          id: `${IMAP_ID_PREFIX}${msg.uid}`,
          threadId: `${IMAP_ID_PREFIX}${msg.uid}`,
          from: env.from?.[0] ? `${env.from[0].name || ""} <${env.from[0].address || ""}>`.trim() : "Unknown",
          subject: env.subject || "(no subject)",
          snippet: "",
          date: env.date ? new Date(env.date).toUTCString() : "",
        });
      }
      emails.reverse();
      return { success: true, emails, message: `Found ${emails.length} emails in inbox (IMAP).` };
    } finally {
      lock.release();
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("IMAP listInbox error:", errMsg);
    return { success: false, message: `Failed to list inbox via IMAP: ${errMsg}` };
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

async function readEmailViaImap(emailUid: string, userCreds?: UserGmailCredentials | null): Promise<{ success: boolean; email?: FullEmail; message: string }> {
  let client: ImapFlow | null = null;
  try {
    client = await getImapClient(userCreds);
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uid = parseInt(emailUid, 10);
      if (isNaN(uid)) {
        return { success: false, message: `Invalid email ID: ${emailUid}` };
      }
      const msg = await client.fetchOne(String(uid), { source: true, envelope: true, uid: true }, { uid: true });
      if (!msg || !msg.source) {
        return { success: false, message: `Email not found with ID: ${emailUid}` };
      }
      const parsed = await simpleParser(msg.source);
      const email: FullEmail = {
        id: emailUid,
        threadId: emailUid,
        from: parsed.from?.text || "Unknown",
        to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map((a: any) => a.text).join(", ") : (parsed.to as any).text || "") : "",
        subject: parsed.subject || "(no subject)",
        body: parsed.text || parsed.html?.replace(/<[^>]+>/g, "").substring(0, 3000) || "(no content)",
        date: parsed.date ? parsed.date.toUTCString() : "",
      };
      return { success: true, email, message: "Email retrieved successfully (via IMAP)." };
    } finally {
      lock.release();
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("IMAP readEmail error:", errMsg);
    return { success: false, message: `Failed to read email via IMAP: ${errMsg}` };
  } finally {
    if (client) try { await client.logout(); } catch {}
  }
}

export async function listInbox(maxResults: number = 10, userCreds?: UserGmailCredentials | null): Promise<{ success: boolean; emails?: InboxEmail[]; message: string }> {
  const attemptGmailApi = async (retry: boolean): Promise<{ success: boolean; emails?: InboxEmail[]; message: string } | null> => {
    try {
      const gmail = await getGmailClient();
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
      const isTokenError = /token|expired|invalid.*credentials|unauthorized|401/i.test(errMsg);
      if (isTokenError && !retry) {
        console.log("Gmail API token error during listInbox, clearing cache and retrying...");
        connectionSettings = null;
        return null;
      }
      throw error;
    }
  };

  try {
    const firstAttempt = await attemptGmailApi(false);
    if (firstAttempt) return firstAttempt;
    const retryAttempt = await attemptGmailApi(true);
    if (retryAttempt) return retryAttempt;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (isImapConfigured(userCreds)) {
      console.log(`Gmail API error (${errMsg}), falling back to IMAP for inbox reading`);
      return listInboxViaImap(maxResults, userCreds);
    }
    console.error("Gmail listInbox error:", errMsg);
    return { success: false, message: "Gmail inbox reading requires IMAP configuration. Please set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in your environment settings." };
  }

  return { success: false, message: "Failed to list inbox: unexpected error" };
}

export async function readEmail(messageId: string, userCreds?: UserGmailCredentials | null): Promise<{ success: boolean; email?: FullEmail; message: string }> {
  if (messageId.startsWith(IMAP_ID_PREFIX)) {
    const imapUid = messageId.slice(IMAP_ID_PREFIX.length);
    if (isImapConfigured(userCreds)) {
      console.log(`Email ID has IMAP prefix, reading directly via IMAP (UID: ${imapUid})`);
      return readEmailViaImap(imapUid, userCreds);
    }
    return { success: false, message: "Email was fetched via IMAP but IMAP is no longer configured." };
  }

  const attemptGmailApi = async (retry: boolean): Promise<{ success: boolean; email?: FullEmail; message: string } | null> => {
    try {
      const gmail = await getGmailClient();
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
      const isTokenError = /token|expired|invalid.*credentials|unauthorized|401/i.test(errMsg);
      if (isTokenError && !retry) {
        console.log("Gmail API token error during readEmail, clearing cache and retrying...");
        connectionSettings = null;
        return null;
      }
      throw error;
    }
  };

  try {
    const firstAttempt = await attemptGmailApi(false);
    if (firstAttempt) return firstAttempt;
    const retryAttempt = await attemptGmailApi(true);
    if (retryAttempt) return retryAttempt;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (isImapConfigured(userCreds)) {
      console.log(`Gmail API error (${errMsg}), falling back to IMAP for email reading`);
      const imapResult = await readEmailViaImap(messageId, userCreds);
      if (imapResult.success) {
        imapResult.message = "Email retrieved successfully (via IMAP).";
        return imapResult;
      }
      console.log(`IMAP fallback also failed for ID ${messageId}: ${imapResult.message}`);
      return { success: false, message: `Could not read this email. Gmail API failed (${errMsg}) and IMAP fallback could not find this email. Try listing your inbox again to get updated references.` };
    }
    console.error("Gmail readEmail error:", errMsg);
    return { success: false, message: "Gmail email reading requires IMAP configuration. Please set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in your environment settings." };
  }

  return { success: false, message: "Failed to read email: unexpected error" };
}

export async function replyToEmail(messageId: string, body: string): Promise<{ success: boolean; message: string; replyMessageId?: string }> {
  try {
    const gmail = await getGmailClient();

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

    let myAddress = process.env.GMAIL_ADDRESS || "me";
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

export async function sendViaGmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ success: boolean; message: string; messageId?: string; fromAddress?: string }> {
  try {
    const gmail = await getGmailClient();
    let fromAddress = process.env.GMAIL_ADDRESS || "me";
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
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Gmail send error:", errMsg);
    return { success: false, message: `Gmail send failed: ${errMsg}` };
  }
}
