import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export type SupportedLang = "en" | "tr";

declare global {
  namespace Express {
    interface Request {
      lang?: SupportedLang;
    }
  }
}

export async function resolveUserLang(req: Request): Promise<SupportedLang> {
  if (req.lang) return req.lang;

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

export function langMiddleware() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.lang = await resolveUserLang(req);
    next();
  };
}

export function t(messages: Record<SupportedLang, string>, lang: SupportedLang): string {
  return messages[lang] || messages.en;
}
