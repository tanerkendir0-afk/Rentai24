import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;

let _cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    const generated = crypto.randomBytes(32).toString("hex");
    console.warn("[Encryption] WARNING: ENCRYPTION_KEY not set. Auto-generated ephemeral key. Set ENCRYPTION_KEY env var for persistent encryption.");
    _cachedKey = Buffer.from(generated, "hex");
    return _cachedKey;
  }
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    _cachedKey = Buffer.from(key, "hex");
  } else {
    _cachedKey = crypto.createHash("sha256").update(key).digest();
  }
  return _cachedKey;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function encryptCredentials(credentials: Record<string, string>): string {
  return encrypt(JSON.stringify(credentials));
}

export function decryptCredentials(encrypted: string): Record<string, string> {
  return JSON.parse(decrypt(encrypted));
}
