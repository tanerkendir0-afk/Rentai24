import { google } from "googleapis";
import { storage } from "./storage";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
];

function getRedirectUri(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
  return `https://${domain}/api/integrations/gmail/oauth/callback`;
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

export function generateGmailOAuthUrl(): { url: string; state: string } {
  const crypto = require("crypto");
  const state = crypto.randomBytes(32).toString("hex");
  const client = createOAuth2Client();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
  return { url, state };
}

export async function handleGoogleCallback(code: string, userId: number): Promise<{ email: string }> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error("No refresh token received. Please try connecting again.");
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const userInfo = await oauth2.userinfo.get();
  const gmailAddress = userInfo.data.email;

  if (!gmailAddress) {
    throw new Error("Could not retrieve Gmail address from Google account.");
  }

  const crypto = await import("crypto");
  const encKey = getEncryptionKey();
  
  const encryptToken = (token: string): string => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", encKey, iv);
    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  };

  const encryptedRefresh = encryptToken(tokens.refresh_token);
  const encryptedAccess = tokens.access_token ? encryptToken(tokens.access_token) : null;
  const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  await storage.updateUserGmailOAuth(userId, {
    gmailAddress,
    gmailRefreshToken: encryptedRefresh,
    gmailAccessToken: encryptedAccess,
    gmailTokenExpiry: tokenExpiry,
  });

  return { email: gmailAddress };
}

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required for credential encryption");
  }
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(secret).digest();
}

export function decryptToken(encrypted: string): string {
  const crypto = require("crypto");
  const encKey = getEncryptionKey();
  const [ivHex, data] = encrypted.split(":");
  if (!ivHex || !data) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", encKey, iv);
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function getOAuthGmailClient(userId: number) {
  const user = await storage.getUserById(userId);
  if (!user?.gmailRefreshToken) {
    return null;
  }

  const client = createOAuth2Client();
  const refreshToken = decryptToken(user.gmailRefreshToken);

  let accessToken: string | null = null;
  const now = new Date();
  const bufferMs = 60_000;

  if (user.gmailAccessToken && user.gmailTokenExpiry && new Date(user.gmailTokenExpiry).getTime() > now.getTime() + bufferMs) {
    try {
      accessToken = decryptToken(user.gmailAccessToken);
    } catch {
      accessToken = null;
    }
  }

  if (!accessToken) {
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    accessToken = credentials.access_token || null;

    if (accessToken && credentials.expiry_date) {
      const crypto = await import("crypto");
      const encKey = getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", encKey, iv);
      let enc = cipher.update(accessToken, "utf8", "hex");
      enc += cipher.final("hex");
      const encryptedAccess = iv.toString("hex") + ":" + enc;

      await storage.updateUserGmailTokens(userId, encryptedAccess, new Date(credentials.expiry_date));
    }
  }

  if (!accessToken) {
    throw new Error("Could not obtain Gmail access token");
  }

  client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth: client });
}

export async function getUserGmailAddress(userId: number): Promise<string | null> {
  const user = await storage.getUserById(userId);
  return user?.gmailAddress || null;
}

export async function isUserGmailOAuthConnected(userId: number): Promise<boolean> {
  const user = await storage.getUserById(userId);
  return !!(user?.gmailRefreshToken);
}

export async function disconnectUserGmail(userId: number): Promise<void> {
  const user = await storage.getUserById(userId);
  if (user?.gmailRefreshToken) {
    try {
      const refreshToken = decryptToken(user.gmailRefreshToken);
      const client = createOAuth2Client();
      await client.revokeToken(refreshToken);
    } catch (err) {
      console.error("Failed to revoke Google token (continuing with local cleanup):", err);
    }
  }
  await storage.clearUserGmailOAuth(userId);
}
