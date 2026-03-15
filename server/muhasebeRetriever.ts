import * as fs from "fs";
import * as path from "path";

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
    console.error("Failed to load turk-muhasebe-chunks.json");
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

  const queryWords = lower.split(/\s+/);
  for (const word of queryWords) {
    if (word.length > 2 && chunk.text.toLowerCase().includes(word)) {
      score += 1;
    }
  }

  return score;
}

export function getMuhasebeContext(query: string, topK = 5): string {
  const chunks = loadChunks();
  if (chunks.length === 0) return "";

  const detectedCategories = detectCategories(query);

  const scored = chunks.map(chunk => ({
    chunk,
    score: scoreChunk(chunk, query, detectedCategories),
  }));

  scored.sort((a, b) => b.score - a.score);

  const topChunks = scored.filter(s => s.score > 0).slice(0, topK);

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
