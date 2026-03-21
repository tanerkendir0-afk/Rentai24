import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { resolveUserLang } from "./i18n";
import { msg } from "./messages";
import type { OrgRole } from "@shared/schema";

type UserRole = "user" | "agent_manager" | "admin";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare module "express-serve-static-core" {
  interface Request {
    organizationId?: number;
    orgRole?: OrgRole;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    const lang = await resolveUserLang(req);
    return res.status(401).json({ error: msg("authRequired", lang) });
  }
  try {
    const orgHeader = req.headers["x-organization-id"];
    if (orgHeader) {
      const orgId = parseInt(String(orgHeader));
      if (!isNaN(orgId)) {
        const role = await storage.getUserOrganizationRole(req.session.userId, orgId);
        if (role) {
          req.organizationId = orgId;
          req.orgRole = role;
        }
      }
    }
  } catch {
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

const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

export function requireOrgRole(...allowedRoles: OrgRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const lang = await resolveUserLang(req);
    if (!req.session.userId) {
      return res.status(401).json({ error: msg("authRequired", lang) });
    }
    const orgId = parseInt(req.params.orgId || req.body?.organizationId || req.query?.orgId as string);
    if (!orgId || isNaN(orgId)) {
      return res.status(400).json({ error: "Organization ID required" });
    }
    const role = await storage.getUserOrganizationRole(req.session.userId, orgId);
    if (!role) {
      return res.status(403).json({ error: "Not a member of this organization" });
    }
    const minLevel = Math.min(...allowedRoles.map(r => ORG_ROLE_HIERARCHY[r]));
    if (ORG_ROLE_HIERARCHY[role] < minLevel) {
      return res.status(403).json({ error: msg("insufficientPermissions", lang) });
    }
    req.organizationId = orgId;
    req.orgRole = role;
    next();
  };
}
