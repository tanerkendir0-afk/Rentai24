import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { resolveUserLang } from "./i18n";
import { msg } from "./messages";

type UserRole = "user" | "agent_manager" | "admin";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    resolveUserLang(req).then(lang => {
      res.status(401).json({ error: msg("authRequired", lang) });
    });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const lang = await resolveUserLang(req);
    if (!req.session.userId) {
      return res.status(401).json({ error: msg("authRequired", lang) });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: msg("userNotFound", lang) });
    }
    if (!allowedRoles.includes(user.role as UserRole)) {
      return res.status(403).json({ error: msg("insufficientPermissions", lang) });
    }
    next();
  };
}
