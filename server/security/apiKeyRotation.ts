import crypto from "crypto";
import { db } from "../db";
import { sql } from "drizzle-orm";

interface ApiKeyRecord {
  id: number;
  userId: number;
  keyPrefix: string;
  keyHash: string;
  label: string;
  permissions: string[];
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isActive: boolean;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const rawKey = crypto.randomBytes(32).toString("base64url");
  const prefix = rawKey.slice(0, 8);
  const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { key: `rai_${rawKey}`, prefix: `rai_${prefix}`, hash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key.replace("rai_", "")).digest("hex");
}

export async function createApiKey(
  userId: number,
  label: string,
  permissions: string[] = ["chat"],
  expiresInDays: number = 90,
): Promise<{ key: string; prefix: string; expiresAt: Date }> {
  const { key, prefix, hash } = generateApiKey();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await db.execute(sql`
    INSERT INTO api_keys (user_id, key_prefix, key_hash, label, permissions, expires_at)
    VALUES (${userId}, ${prefix}, ${hash}, ${label}, ${JSON.stringify(permissions)}::jsonb, ${expiresAt})
  `);

  return { key, prefix, expiresAt };
}

export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  userId?: number;
  permissions?: string[];
  reason?: string;
}> {
  const hash = hashApiKey(key);

  const result = await db.execute(sql`
    SELECT id, user_id, permissions, expires_at, is_active
    FROM api_keys
    WHERE key_hash = ${hash}
    LIMIT 1
  `);

  const rows = result.rows as any[];
  if (rows.length === 0) {
    return { valid: false, reason: "Invalid API key" };
  }

  const record = rows[0];
  if (!record.is_active) {
    return { valid: false, reason: "API key has been revoked" };
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return { valid: false, reason: "API key has expired" };
  }

  await db.execute(sql`
    UPDATE api_keys SET last_used_at = NOW() WHERE id = ${record.id}
  `);

  return {
    valid: true,
    userId: record.user_id,
    permissions: record.permissions || ["chat"],
  };
}

export async function rotateApiKey(
  userId: number,
  oldKeyPrefix: string,
  label?: string,
): Promise<{ key: string; prefix: string; expiresAt: Date }> {
  await db.execute(sql`
    UPDATE api_keys SET is_active = false
    WHERE user_id = ${userId} AND key_prefix = ${oldKeyPrefix} AND is_active = true
  `);

  return createApiKey(userId, label || `Rotated from ${oldKeyPrefix}`, ["chat"], 90);
}

export async function revokeApiKey(userId: number, keyPrefix: string): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE api_keys SET is_active = false
    WHERE user_id = ${userId} AND key_prefix = ${keyPrefix}
    RETURNING id
  `);

  return (result.rows as any[]).length > 0;
}

export async function listApiKeys(userId: number): Promise<Array<{
  prefix: string;
  label: string;
  permissions: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}>> {
  const result = await db.execute(sql`
    SELECT key_prefix, label, permissions, created_at, expires_at, last_used_at, is_active
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `);

  return (result.rows as any[]).map(row => ({
    prefix: row.key_prefix,
    label: row.label,
    permissions: row.permissions || [],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    isActive: row.is_active,
  }));
}

export async function cleanupExpiredKeys(): Promise<number> {
  const result = await db.execute(sql`
    UPDATE api_keys SET is_active = false
    WHERE is_active = true AND expires_at < NOW()
    RETURNING id
  `);
  return (result.rows as any[]).length;
}
