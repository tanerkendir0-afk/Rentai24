import OpenAI from "openai";
import fs from "fs";
import path from "path";
import https from "https";

function getImageClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Görsel servisi yapılandırılmamış: OPENAI_API_KEY environment variable tanımlı değil. Lütfen OpenAI API anahtarınızı ayarlayın."
    );
  }
  return new OpenAI({ apiKey });
}

const imageDir = path.resolve("/tmp/rentai-images");
if (!fs.existsSync(imageDir)) {
  fs.mkdirSync(imageDir, { recursive: true });
}

function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          https.get(redirectUrl, (res2) => {
            res2.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
          }).on("error", reject);
          return;
        }
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", reject);
  });
}

export async function generateAIImage(
  prompt: string,
  aspectRatio: string = "1:1"
): Promise<{ success: boolean; imageUrl?: string; filePath?: string; error?: string }> {
  try {
    const sizeMap: Record<string, "1024x1024" | "1792x1024" | "1024x1792"> = {
      "1:1": "1024x1024",
      "4:3": "1792x1024",
      "16:9": "1792x1024",
      "3:4": "1024x1792",
      "9:16": "1024x1792",
    };

    const size = sizeMap[aspectRatio] || "1024x1024";

    const client = getImageClient();
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      return { success: false, error: "No image generated" };
    }

    const filename = `ai-${Date.now()}.png`;
    const filepath = path.join(imageDir, filename);
    await downloadImage(imageUrl, filepath);

    return { success: true, imageUrl: `/api/images/${filename}`, filePath: filepath };
  } catch (error: any) {
    console.error("Image generation error:", error?.message || error);
    return { success: false, error: error?.message || "Image generation failed" };
  }
}

export async function findStockImages(
  description: string,
  count: number = 3,
  orientation: string = "horizontal"
): Promise<{ success: boolean; images?: Array<{ url: string; alt: string }>; error?: string }> {
  try {
    const client = getImageClient();
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: `Professional stock photo style: ${description}. Photorealistic, high quality, clean composition, good lighting. This should look like a real photograph, not an illustration.`,
      n: 1,
      size: orientation === "vertical" ? "1024x1792" : "1792x1024",
      quality: "standard",
    });

    const results: Array<{ url: string; alt: string }> = [];

    for (const img of response.data) {
      if (img.url) {
        const filename = `stock-${Date.now()}-${results.length}.png`;
        const filepath = path.join(imageDir, filename);
        await downloadImage(img.url, filepath);
        results.push({ url: `/api/images/${filename}`, alt: description });
      }
    }

    return { success: true, images: results };
  } catch (error: any) {
    console.error("Stock image error:", error?.message || error);
    return { success: false, error: error?.message || "Stock image search failed" };
  }
}

export function getImagePath(filename: string): string | null {
  const filepath = path.join(imageDir, filename);
  if (fs.existsSync(filepath)) return filepath;
  return null;
}

export const chatImageDir = path.resolve("/tmp/rentai-chat-uploads");
if (!fs.existsSync(chatImageDir)) {
  fs.mkdirSync(chatImageDir, { recursive: true });
}
