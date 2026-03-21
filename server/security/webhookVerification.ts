import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

export function verifyHmacSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: "sha1" | "sha256" = "sha256",
  prefix: string = "",
): boolean {
  const hmac = crypto.createHmac(algorithm, secret).update(payload).digest("hex");
  const expected = prefix ? `${prefix}${hmac}` : hmac;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function whatsappWebhookVerification(appSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers["x-hub-signature-256"] as string;
    if (!signature) {
      console.warn("[WebhookVerify] Missing X-Hub-Signature-256 header");
      return res.status(401).json({ error: "Missing signature" });
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: "Missing raw body" });
    }

    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    if (!verifyHmacSignature(bodyStr, signature, appSecret, "sha256", "sha256=")) {
      console.warn("[WebhookVerify] Invalid WhatsApp webhook signature");
      return res.status(403).json({ error: "Invalid signature" });
    }

    next();
  };
}

export function telegramWebhookVerification(secretToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["x-telegram-bot-api-secret-token"] as string;
    if (!token || token !== secretToken) {
      console.warn("[WebhookVerify] Invalid Telegram secret token");
      return res.status(403).json({ error: "Invalid secret token" });
    }
    next();
  };
}

export function genericWebhookVerification(options: {
  headerName: string;
  secret: string;
  algorithm?: "sha1" | "sha256";
  prefix?: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers[options.headerName.toLowerCase()] as string;
    if (!signature) {
      return res.status(401).json({ error: "Missing webhook signature" });
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(400).json({ error: "Missing raw body" });
    }

    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
    if (!verifyHmacSignature(bodyStr, signature, options.secret, options.algorithm || "sha256", options.prefix || "")) {
      return res.status(403).json({ error: "Invalid webhook signature" });
    }

    next();
  };
}
