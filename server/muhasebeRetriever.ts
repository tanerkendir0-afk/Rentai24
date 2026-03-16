import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

interface ChunkMetadata {
  category: string;
  subcategory: string;
  section: string;
  keywords: string[];
  year: string;
}

interface Chunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

interface ChunksData {
  metadata: Record<string, unknown>;
  chunks: Chunk[];
}

interface PineconeMatch {
  id: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "muhasebe-referans";
const PINECONE_NAMESPACE = "turk-muhasebe";

let pineconeIndex: ReturnType<Pinecone["Index"]> | null = null;
let openaiClient: OpenAI | null = null;
let pineconeAvailable = true;
let pineconeDisabledUntil = 0;
const CIRCUIT_BREAKER_MS = 5 * 60 * 1000;

function disablePineconeTemporarily(): void {
  pineconeDisabledUntil = Date.now() + CIRCUIT_BREAKER_MS;
  console.warn(`[MuhasebeRetriever] Pinecone disabled for ${CIRCUIT_BREAKER_MS / 1000}s (circuit breaker)`);
}

function isPineconeEnabled(): boolean {
  if (!pineconeAvailable) return false;
  if (pineconeDisabledUntil > 0 && Date.now() < pineconeDisabledUntil) return false;
  if (pineconeDisabledUntil > 0 && Date.now() >= pineconeDisabledUntil) {
    pineconeDisabledUntil = 0;
    pineconeIndex = null;
    console.log("[MuhasebeRetriever] Circuit breaker reset, retrying Pinecone");
  }
  return true;
}

function initPinecone(): ReturnType<Pinecone["Index"]> | null {
  if (pineconeIndex) return pineconeIndex;
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.warn("[MuhasebeRetriever] PINECONE_API_KEY not set, using local fallback");
    pineconeAvailable = false;
    return null;
  }
  try {
    const pc = new Pinecone({ apiKey });
    pineconeIndex = pc.Index(PINECONE_INDEX_NAME);
    return pineconeIndex;
  } catch (e) {
    console.error("[MuhasebeRetriever] Failed to init Pinecone:", e);
    disablePineconeTemporarily();
    return null;
  }
}

function initOpenAI(): OpenAI | null {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("[MuhasebeRetriever] OPENAI_API_KEY not set for embeddings");
    return null;
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const client = initOpenAI();
  if (!client) return null;
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (e) {
    console.error("[MuhasebeRetriever] Embedding error:", e);
    return null;
  }
}

async function pineconeSearch(query: string, topK: number): Promise<string> {
  const index = initPinecone();
  if (!index) return "";

  const embedding = await generateEmbedding(query);
  if (!embedding) return "";

  try {
    const ns = index.namespace(PINECONE_NAMESPACE);
    const results = await ns.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    const matches: PineconeMatch[] = results.matches || [];
    if (matches.length === 0) return "";

    const parts = ["<referans_bilgisi>"];
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const meta = match.metadata || {};
      const text = (meta.text as string) || "";
      const category = (meta.category as string) || "";
      const subcategory = (meta.subcategory as string) || "";
      const year = (meta.year as string) || "";
      const yearNote = year && year !== "evergreen" ? ` [Yıl: ${year}]` : "";
      const scoreNote = match.score !== undefined ? ` (skor: ${match.score.toFixed(3)})` : "";
      parts.push(
        `\n[Kaynak ${i + 1}: ${category}/${subcategory}${yearNote}${scoreNote}]\n${text}\n`
      );
    }
    parts.push("</referans_bilgisi>");
    return parts.join("\n");
  } catch (e) {
    console.error("[MuhasebeRetriever] Pinecone query error:", e);
    disablePineconeTemporarily();
    return "";
  }
}

let cachedChunks: Chunk[] | null = null;

function loadChunks(): Chunk[] {
  if (cachedChunks) return cachedChunks;
  try {
    const filePath = path.join(__dirname, "turk-muhasebe-chunks.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data: ChunksData = JSON.parse(raw);
    cachedChunks = data.chunks;
    return cachedChunks;
  } catch {
    console.error("[MuhasebeRetriever] Failed to load turk-muhasebe-chunks.json");
    return [];
  }
}

const categoryKeywords: Record<string, string[]> = {
  kdv: ["kdv", "katma değer", "tevkifat", "istisna", "muaf", "indirilecek", "hesaplanan"],
  sgk: ["sgk", "sigorta", "prim", "işsizlik", "tavan", "taban", "asgari ücret"],
  bordro: ["bordro", "maaş", "brüt", "net", "ücret hesaplama"],
  gelir_vergisi: ["gelir vergisi", "vergi dilimi", "tarife", "stopaj", "kümülatif"],
  damga_vergisi: ["damga vergisi", "binde"],
  diib: ["dİİb", "dahilde işleme", "taahhüt", "tecil", "terkin"],
  ihracat: ["ihracat", "yurtdışı satış", "gb", "gümrük beyannamesi", "601"],
  ithalat: ["ithalat", "cif", "fob", "gümrük vergisi", "navlun"],
  kambiyo: ["kambiyo", "ibkb", "döviz", "tcmb", "bedel getirme", "180 gün"],
  kur: ["kur", "kur farkı", "kambiyo kârı", "kambiyo zararı", "değerleme"],
  amortisman: ["amortisman", "faydalı ömür", "azalan bakiye"],
  fatura: ["fatura", "e-fatura", "e-arşiv", "iade faturası"],
  tazminat: ["kıdem", "ihbar", "tazminat"],
  insaat: ["inşaat", "hakediş", "yıllara yaygın"],
  sektorel: ["fire", "hurda", "hadde", "galvaniz", "çelik", "imalat"],
  hesap_plani: ["hesap planı", "hesap kodu", "tdhp", "tekdüzen"],
  beyanname: ["beyanname", "takvim", "ba-bs"],
  stopaj: ["stopaj", "tevkifat oranı", "serbest meslek", "kira stopaj"],
  kayit_sablonu: ["muhasebe kaydı", "yevmiye", "borç alacak", "kayıt"],
};

function detectCategories(query: string): string[] {
  const lower = query.toLowerCase();
  const detected: string[] = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        detected.push(category);
        break;
      }
    }
  }
  return detected;
}

function scoreChunk(chunk: Chunk, query: string, detectedCategories: string[]): number {
  const lower = query.toLowerCase();
  let score = 0;
  if (detectedCategories.includes(chunk.metadata.category)) {
    score += 10;
  }
  for (const keyword of chunk.metadata.keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      score += 3;
    }
  }
  const queryWords = lower.split(/\s+/).filter(w => w.length > 2);
  const chunkLower = chunk.text.toLowerCase();
  for (const word of queryWords) {
    if (chunkLower.includes(word)) {
      score += 2;
    }
  }
  const matchedWordRatio = queryWords.filter(w => chunkLower.includes(w)).length / Math.max(queryWords.length, 1);
  if (matchedWordRatio > 0.5) {
    score += 3;
  }
  return score;
}

function localKeywordSearch(query: string, topK: number): string {
  const chunks = loadChunks();
  if (chunks.length === 0) return "";

  const detectedCategories = detectCategories(query);
  const scored = chunks.map(chunk => ({
    chunk,
    score: scoreChunk(chunk, query, detectedCategories),
  }));
  scored.sort((a, b) => b.score - a.score);
  let topChunks = scored.filter(s => s.score > 0).slice(0, topK);
  if (topChunks.length === 0) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length > 0) {
      const broadScored = chunks.map(chunk => {
        const chunkLower = chunk.text.toLowerCase();
        let broadScore = 0;
        for (const word of queryWords) {
          if (chunkLower.includes(word)) broadScore += 1;
        }
        return { chunk, score: broadScore };
      });
      broadScored.sort((a, b) => b.score - a.score);
      topChunks = broadScored.filter(s => s.score > 0).slice(0, topK);
    }
  }
  if (topChunks.length === 0) {
    const evergreenChunks = chunks
      .filter(c => c.metadata.year === "evergreen")
      .slice(0, Math.min(topK, 3));
    if (evergreenChunks.length > 0) {
      topChunks = evergreenChunks.map(chunk => ({ chunk, score: 0 }));
    } else {
      topChunks = chunks.slice(0, Math.min(topK, 3)).map(chunk => ({ chunk, score: 0 }));
    }
  }
  if (topChunks.length === 0) return "";

  const parts = ["<referans_bilgisi>"];
  for (let i = 0; i < topChunks.length; i++) {
    const { chunk } = topChunks[i];
    const yearNote = chunk.metadata.year !== "evergreen" ? ` [Yıl: ${chunk.metadata.year}]` : "";
    parts.push(
      `\n[Kaynak ${i + 1}: ${chunk.metadata.category}/${chunk.metadata.subcategory}${yearNote}]\n${chunk.text}\n`
    );
  }
  parts.push("</referans_bilgisi>");
  return parts.join("\n");
}

export async function getMuhasebeContext(query: string, topK = 5): Promise<string> {
  if (isPineconeEnabled()) {
    try {
      const result = await pineconeSearch(query, topK);
      if (result) {
        console.log("[MuhasebeRetriever] Pinecone vector search returned results");
        return result;
      }
    } catch (e) {
      console.warn("[MuhasebeRetriever] Pinecone failed, falling back to local:", e);
      disablePineconeTemporarily();
    }
  }

  console.log("[MuhasebeRetriever] Using local keyword search fallback");
  return localKeywordSearch(query, topK);
}
