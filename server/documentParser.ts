import fs from "fs";
import path from "path";

export async function parseDocument(
  filePath: string,
  originalName: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case ".txt":
    case ".md":
      return fs.readFileSync(filePath, "utf-8");

    case ".pdf": {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buffer: Buffer) => Promise<{ text: string }> }).default;
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    }

    case ".docx": {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    }

    case ".csv": {
      const { parse } = await import("csv-parse/sync");
      const content = fs.readFileSync(filePath, "utf-8");
      const records = parse(content, { columns: true, skip_empty_lines: true });
      return (records as Record<string, string>[])
        .map((row: Record<string, string>) =>
          Object.entries(row)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        )
        .join("\n");
    }

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

export async function fetchUrlContent(url: string): Promise<string> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP/HTTPS URLs are allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  const blockedPatterns = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "192.168.", "::1", "metadata.google", "169.254.169.254"];
  if (blockedPatterns.some(p => hostname.includes(p) || hostname === p)) {
    throw new Error("Access to internal/private URLs is not allowed");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "RentAI24-Bot/1.0" },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error("URL content exceeds 5MB limit");
    }
    const html = await response.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } finally {
    clearTimeout(timeout);
  }
}

export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  if (words.length <= chunkSize) {
    return [words.join(" ")];
  }

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(" ");
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
    start += chunkSize - overlap;
  }

  return chunks;
}
