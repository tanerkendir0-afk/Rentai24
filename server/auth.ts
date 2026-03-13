import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

type UserRole = "user" | "agent_manager" | "admin";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (!allowedRoles.includes(user.role as UserRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
