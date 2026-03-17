import OpenAI from "openai";

interface ResponseOutputItem {
  type: string;
  content?: ResponseContentBlock[];
  status?: string;
  action?: { type: string; queries?: string[]; query?: string };
}

interface ResponseContentBlock {
  type: string;
  text?: string;
  annotations?: ResponseAnnotation[];
}

interface ResponseAnnotation {
  type: string;
  url?: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}

const directClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const proxyClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  answer: string;
  results: SearchResult[];
  query: string;
}

export interface CompanyAnalysis {
  companyName: string;
  website: string;
  industry: string;
  description: string;
  classification: "buyer" | "seller" | "manufacturer" | "service_provider" | "unknown";
  classificationConfidence: number;
  products: string[];
  potentialBuyer: boolean;
  reasoning: string;
  contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  };
}

export async function realWebSearch(query: string): Promise<WebSearchResponse> {
  try {
    const response = await directClient.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search_preview" }],
      input: query,
    });

    let answer = "";
    const results: SearchResult[] = [];
    const seenUrls = new Set<string>();

    const outputItems = (response.output || []) as unknown as ResponseOutputItem[];
    for (const item of outputItems) {
      if (item.type === "message" && item.content) {
        for (const block of item.content) {
          if (block.type === "output_text" || block.type === "text") {
            answer += block.text || "";
            if (block.annotations) {
              for (const ann of block.annotations) {
                if (ann.type === "url_citation" && ann.url && !seenUrls.has(ann.url)) {
                  const cleanUrl = ann.url.split("?utm_source=")[0];
                  if (!seenUrls.has(cleanUrl)) {
                    seenUrls.add(cleanUrl);
                    results.push({
                      title: ann.title || "",
                      url: cleanUrl,
                      snippet: "",
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    if (results.length > 0 && answer) {
      const lines = answer.split("\n").filter(l => l.trim());
      for (const result of results) {
        if (!result.snippet) {
          const matchLine = lines.find(l => l.includes(result.title) || l.includes(result.url));
          if (matchLine) {
            result.snippet = matchLine.replace(/\*\*/g, "").replace(/\[.*?\]\(.*?\)/g, "").trim().substring(0, 200);
          }
        }
      }
    }

    return { answer: answer.trim(), results, query };
  } catch (err) {
    console.error("[WebSearch] Responses API failed:", (err as Error).message);
    return { answer: "", results: [], query };
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RentAI-Rex/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return false;
    if (hostname.startsWith("10.") || hostname.startsWith("172.") || hostname.startsWith("192.168.")) return false;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    if (parsed.port && !["80", "443", ""].includes(parsed.port)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchWebPage(url: string): Promise<string> {
  if (!isAllowedUrl(url)) {
    throw new Error("URL is not allowed (blocked private/internal addresses)");
  }
  try {
    const html = await fetchWithTimeout(url, 15000);
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    return text.substring(0, 8000);
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${(err as Error).message}`);
  }
}

export async function analyzeCompany(
  companyName: string,
  websiteUrl: string | undefined,
  productContext: string,
  pageContent?: string
): Promise<CompanyAnalysis> {
  let webContent = pageContent || "";

  if (!webContent && websiteUrl && isAllowedUrl(websiteUrl)) {
    try {
      webContent = await fetchWebPage(websiteUrl);
    } catch (err) {
      console.warn(`[ResearchCompany] Failed to fetch ${websiteUrl}:`, (err as Error).message);
    }
  }

  if (!webContent && !websiteUrl) {
    const searchResults = await realWebSearch(`${companyName} firma ne üretir ürünleri`);
    if (searchResults.results.length > 0) {
      const safeResult = searchResults.results.find(r => isAllowedUrl(r.url));
      if (safeResult) {
        websiteUrl = safeResult.url;
        try {
          webContent = await fetchWebPage(websiteUrl);
        } catch {
          webContent = searchResults.results.map(r => `${r.title}: ${r.snippet}`).join("\n");
        }
      } else {
        webContent = searchResults.results.map(r => `${r.title}: ${r.snippet}`).join("\n");
      }
    }
  }

  const prompt = `Analyze this company and classify it for B2B sales targeting.

COMPANY: ${companyName}
${websiteUrl ? `WEBSITE: ${websiteUrl}` : ""}
PRODUCT WE SELL: ${productContext}

${webContent ? `WEBSITE CONTENT:\n${webContent.substring(0, 4000)}` : "No website content available."}

IMPORTANT CLASSIFICATION RULES:
- "buyer": This company USES/BUYS the product we sell as raw material or component in their manufacturing
- "seller": This company SELLS the same product we sell (competitor)
- "manufacturer": This company MANUFACTURES the product we sell (potential supplier or competitor)
- "service_provider": This company provides services related to the industry but doesn't buy/sell the product
- "unknown": Cannot determine

For example, if we sell "galvanized wire":
- A fence manufacturer → "buyer" (they USE wire to make fences)
- A wire distributor → "seller" (they also sell wire)
- A wire factory → "manufacturer" (they make wire)
- A construction company → "buyer" (they might use wire products)

Respond in JSON format:
{
  "companyName": "...",
  "website": "...",
  "industry": "...",
  "description": "Brief description of what the company does",
  "classification": "buyer|seller|manufacturer|service_provider|unknown",
  "classificationConfidence": 0.0-1.0,
  "products": ["list", "of", "their", "products"],
  "potentialBuyer": true/false,
  "reasoning": "Why this classification",
  "contactInfo": { "email": "...", "phone": "...", "address": "..." }
}`;

  try {
    const response = await proxyClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a B2B market analyst. Analyze companies and classify them. Always respond with valid JSON only, no markdown." },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(cleaned) as CompanyAnalysis;
    analysis.website = analysis.website || websiteUrl || "";
    return analysis;
  } catch (err) {
    return {
      companyName,
      website: websiteUrl || "",
      industry: "unknown",
      description: "Analysis failed",
      classification: "unknown",
      classificationConfidence: 0,
      products: [],
      potentialBuyer: false,
      reasoning: `Analysis error: ${(err as Error).message}`,
      contactInfo: {},
    };
  }
}

export async function findLeads(
  product: string,
  industry?: string,
  location?: string,
  count: number = 5
): Promise<{ leads: CompanyAnalysis[]; searchQueries: string[] }> {
  const queries = generateSmartQueries(product, industry, location);
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries.slice(0, 3)) {
    const searchResponse = await realWebSearch(query);
    for (const result of searchResponse.results) {
      const domain = extractDomain(result.url);
      if (domain && !seenUrls.has(domain) && !isGenericSite(domain)) {
        seenUrls.add(domain);
        allResults.push(result);
      }
    }
    if (allResults.length >= count * 2) break;
  }

  const leads: CompanyAnalysis[] = [];
  for (const result of allResults.slice(0, count * 2)) {
    if (leads.length >= count) break;

    let pageContent: string | undefined;
    if (result.url && isAllowedUrl(result.url)) {
      try {
        pageContent = await fetchWebPage(result.url);
      } catch {
        pageContent = result.snippet || undefined;
      }
    }

    const analysis = await analyzeCompany(
      result.title.split(" - ")[0].split(" | ")[0].trim(),
      result.url,
      product,
      pageContent
    );

    if (analysis.potentialBuyer && analysis.classificationConfidence >= 0.4) {
      leads.push(analysis);
    }
  }

  return { leads, searchQueries: queries };
}

function generateSmartQueries(product: string, industry?: string, location?: string): string[] {
  const locationStr = location ? ` ${location}` : " Türkiye";
  const queries: string[] = [];

  queries.push(`${product} kullanan üreticiler${locationStr}`);
  queries.push(`${product} alıcıları${locationStr} firma`);

  if (industry) {
    queries.push(`${industry} üreticileri${locationStr}`);
    queries.push(`${industry} firmaları${locationStr} hammadde`);
  }

  const productLower = product.toLowerCase();
  if (productLower.includes("tel") || productLower.includes("wire")) {
    queries.push(`çit üreticileri${locationStr}`);
    queries.push(`kafes teli imalatı${locationStr}`);
    queries.push(`mesh panel üreticileri${locationStr}`);
    queries.push(`demir doğrama atölyeleri${locationStr}`);
  } else if (productLower.includes("boru") || productLower.includes("pipe")) {
    queries.push(`tesisat firmaları${locationStr}`);
    queries.push(`inşaat malzemesi${locationStr}`);
  } else if (productLower.includes("sac") || productLower.includes("sheet") || productLower.includes("plaka")) {
    queries.push(`metal işleme atölyeleri${locationStr}`);
    queries.push(`otomotiv yan sanayi${locationStr}`);
  }

  queries.push(`${product} toptan${locationStr}`);

  return queries;
}

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function isGenericSite(domain: string): boolean {
  const genericDomains = [
    "wikipedia.org", "facebook.com", "twitter.com", "instagram.com",
    "youtube.com", "linkedin.com", "reddit.com", "amazon.com",
    "trendyol.com", "hepsiburada.com", "n11.com", "sahibinden.com",
    "google.com", "bing.com", "yahoo.com", "duckduckgo.com",
    "pinterest.com", "quora.com", "medium.com",
  ];
  return genericDomains.some(g => domain.includes(g));
}
