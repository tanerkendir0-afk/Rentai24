import { Request } from "express";
import { storage } from "./storage";

export type SupportedLang = "en" | "tr";

export async function resolveUserLang(req: Request): Promise<SupportedLang> {
  if (req.session?.userId) {
    try {
      const user = await storage.getUserById(req.session.userId);
      if (user?.language === "tr") return "tr";
      if (user?.language === "en") return "en";
    } catch {}
  }

  const accept = req.headers["accept-language"] || "";
  if (/^tr\b/i.test(accept) || accept.includes("tr-TR")) return "tr";
  return "en";
}

export function t(messages: Record<SupportedLang, string>, lang: SupportedLang): string {
  return messages[lang] || messages.en;
}
