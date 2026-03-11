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
      const pdfParse = (await import("pdf-parse")).default;
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
      return records
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
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }
  const html = await response.text();
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
