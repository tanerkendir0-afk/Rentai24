import { db } from "../db";
import { agentSkills, agentSkillAssignments, type AgentSkill, type SkillParameter } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import OpenAI from "openai";

const aiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SkillExecutionResult {
  success: boolean;
  output: any;
  error?: string;
  durationMs: number;
}

export interface BuiltinSkillDefinition {
  name: string;
  nameTr: string;
  description: string;
  descriptionTr: string;
  category: string;
  icon: string;
  parameters: SkillParameter[];
  keywords: string[];
  execute: (params: Record<string, any>) => Promise<{ success: boolean; output: any; error?: string }>;
}

function isBlockedUrl(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return "Only HTTP/HTTPS allowed";
    const hostname = parsed.hostname.toLowerCase();
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "[::1]", "metadata.google.internal"];
    if (blockedHosts.some(h => hostname === h)) return "Internal URLs not allowed";
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return "Internal URLs not allowed";
    const parts = hostname.split(".");
    if (parts.length === 4 && parts.every(p => /^\d+$/.test(p))) {
      const octets = parts.map(Number);
      if (octets[0] === 10) return "Private IP range (10.x.x.x) not allowed";
      if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return "Private IP range (172.16-31.x.x) not allowed";
      if (octets[0] === 192 && octets[1] === 168) return "Private IP range (192.168.x.x) not allowed";
      if (octets[0] === 127) return "Loopback not allowed";
      if (octets[0] === 169 && octets[1] === 254) return "Link-local not allowed";
      if (octets[0] === 0) return "Zero-prefix IP not allowed";
    }
    return null;
  } catch {
    return "Invalid URL";
  }
}

async function safeEvalExpression(expr: string, context: Record<string, any> = {}): Promise<any> {
  const vm = await import("vm");
  const sandbox = { params: context, Math, String, Number, Boolean, Array, Object, JSON, Date, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent };
  const vmContext = vm.createContext(sandbox);
  const sanitized = expr.replace(/require|import|process|global|__dirname|__filename|eval|Function/g, "_blocked_");
  const script = new vm.Script(`(function() { "use strict"; ${sanitized} })()`, { timeout: 3000 });
  return script.runInContext(vmContext, { timeout: 3000 });
}

export const BUILTIN_SKILLS: Record<string, BuiltinSkillDefinition> = {
  text_summarize: {
    name: "text_summarize",
    nameTr: "Metin Özetleme",
    description: "Summarize long text into a concise version using AI",
    descriptionTr: "Uzun metni AI kullanarak kısa bir özete dönüştürür",
    category: "ai_powered",
    icon: "FileText",
    parameters: [
      { name: "text", label: "Text", labelTr: "Metin", type: "text", required: true, placeholder: "Özetlenecek metin..." },
      { name: "maxLength", label: "Max Length", labelTr: "Maks Uzunluk", type: "number", required: false, defaultValue: 200, placeholder: "200" },
      { name: "language", label: "Language", labelTr: "Dil", type: "select", required: false, defaultValue: "tr", options: ["tr", "en", "de", "fr", "es", "ar"] },
    ],
    keywords: ["özetle", "özet", "summarize", "summary", "kısalt", "shorten"],
    execute: async (params) => {
      const { text, maxLength = 200, language = "tr" } = params;
      if (!text) return { success: false, output: null, error: "Text is required" };
      const langLabel = language === "tr" ? "Türkçe" : language === "en" ? "English" : language;
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Summarize the following text in ${langLabel}. Keep it under ${maxLength} characters. Be concise and capture key points.` },
          { role: "user", content: text.substring(0, 8000) },
        ],
        max_tokens: 500,
      });
      return { success: true, output: { summary: response.choices[0]?.message?.content || "" } };
    },
  },

  translate_text: {
    name: "translate_text",
    nameTr: "Metin Çeviri",
    description: "Translate text between languages using AI",
    descriptionTr: "AI kullanarak metni diller arası çevirir",
    category: "ai_powered",
    icon: "Globe",
    parameters: [
      { name: "text", label: "Text", labelTr: "Metin", type: "text", required: true, placeholder: "Çevrilecek metin..." },
      { name: "targetLanguage", label: "Target Language", labelTr: "Hedef Dil", type: "select", required: true, options: ["tr", "en", "de", "fr", "es", "ar", "ru", "zh", "ja", "ko", "it", "pt", "nl"] },
      { name: "sourceLanguage", label: "Source Language", labelTr: "Kaynak Dil", type: "select", required: false, options: ["auto", "tr", "en", "de", "fr", "es", "ar", "ru", "zh", "ja", "ko"] },
    ],
    keywords: ["çevir", "çeviri", "translate", "translation", "tercüme"],
    execute: async (params) => {
      const { text, targetLanguage, sourceLanguage = "auto" } = params;
      if (!text || !targetLanguage) return { success: false, output: null, error: "Text and target language required" };
      const langNames: Record<string, string> = { tr: "Turkish", en: "English", de: "German", fr: "French", es: "Spanish", ar: "Arabic", ru: "Russian", zh: "Chinese", ja: "Japanese", ko: "Korean", it: "Italian", pt: "Portuguese", nl: "Dutch" };
      const targetName = langNames[targetLanguage] || targetLanguage;
      const srcInstruction = sourceLanguage === "auto" ? "Detect the source language automatically." : `Source language is ${langNames[sourceLanguage] || sourceLanguage}.`;
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Translate the following text to ${targetName}. ${srcInstruction} Return only the translation, no explanations.` },
          { role: "user", content: text.substring(0, 8000) },
        ],
        max_tokens: 2000,
      });
      return { success: true, output: { translation: response.choices[0]?.message?.content || "", targetLanguage } };
    },
  },

  sentiment_analysis: {
    name: "sentiment_analysis",
    nameTr: "Duygu Analizi",
    description: "Analyze sentiment of text (positive, negative, neutral)",
    descriptionTr: "Metnin duygusal tonunu analiz eder (olumlu, olumsuz, nötr)",
    category: "ai_powered",
    icon: "Heart",
    parameters: [
      { name: "text", label: "Text", labelTr: "Metin", type: "text", required: true, placeholder: "Analiz edilecek metin..." },
    ],
    keywords: ["duygu", "sentiment", "analiz", "tone", "mood", "olumlu", "olumsuz"],
    execute: async (params) => {
      const { text } = params;
      if (!text) return { success: false, output: null, error: "Text is required" };
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Analyze the sentiment of the following text. Respond in JSON format: {"sentiment": "positive|negative|neutral|mixed", "confidence": 0.0-1.0, "emotions": ["joy","anger","sadness","surprise","fear","disgust"], "summary": "brief explanation in Turkish"}` },
          { role: "user", content: text.substring(0, 4000) },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      });
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      return { success: true, output: result };
    },
  },

  keyword_extract: {
    name: "keyword_extract",
    nameTr: "Anahtar Kelime Çıkarma",
    description: "Extract keywords and key phrases from text",
    descriptionTr: "Metinden anahtar kelime ve ifadeleri çıkarır",
    category: "ai_powered",
    icon: "Tag",
    parameters: [
      { name: "text", label: "Text", labelTr: "Metin", type: "text", required: true, placeholder: "Metin..." },
      { name: "maxKeywords", label: "Max Keywords", labelTr: "Maks Anahtar Kelime", type: "number", required: false, defaultValue: 10, placeholder: "10" },
    ],
    keywords: ["anahtar", "kelime", "keyword", "extract", "tag", "etiket"],
    execute: async (params) => {
      const { text, maxKeywords = 10 } = params;
      if (!text) return { success: false, output: null, error: "Text is required" };
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Extract up to ${maxKeywords} keywords/key phrases from the text. Return JSON: {"keywords": ["word1","word2",...], "topics": ["topic1","topic2",...]}` },
          { role: "user", content: text.substring(0, 6000) },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      });
      const result = JSON.parse(response.choices[0]?.message?.content || '{"keywords":[],"topics":[]}');
      return { success: true, output: result };
    },
  },

  math_evaluate: {
    name: "math_evaluate",
    nameTr: "Matematik Hesaplama",
    description: "Evaluate mathematical expressions safely",
    descriptionTr: "Matematiksel ifadeleri güvenli şekilde hesaplar",
    category: "calculation",
    icon: "Calculator",
    parameters: [
      { name: "expression", label: "Expression", labelTr: "İfade", type: "string", required: true, placeholder: "(100 * 1.18) - 50" },
      { name: "precision", label: "Decimal Precision", labelTr: "Ondalık Hassasiyet", type: "number", required: false, defaultValue: 2, placeholder: "2" },
    ],
    keywords: ["hesapla", "calculate", "math", "matematik", "toplam", "çarp", "böl"],
    execute: async (params) => {
      const { expression, precision = 2 } = params;
      if (!expression) return { success: false, output: null, error: "Expression is required" };
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      if (!sanitized.trim()) return { success: false, output: null, error: "Invalid expression" };
      try {
        const result = Function(`"use strict"; return (${sanitized})`)();
        if (typeof result !== "number" || !isFinite(result)) {
          return { success: false, output: null, error: "Expression did not produce a valid number" };
        }
        return { success: true, output: { expression: sanitized, result: Number(result.toFixed(precision)) } };
      } catch (e: any) {
        return { success: false, output: null, error: `Calculation error: ${e.message}` };
      }
    },
  },

  currency_convert: {
    name: "currency_convert",
    nameTr: "Döviz Çevirici",
    description: "Convert between currencies using TCMB rates",
    descriptionTr: "TCMB kurları ile döviz çevirisi yapar",
    category: "calculation",
    icon: "DollarSign",
    parameters: [
      { name: "amount", label: "Amount", labelTr: "Tutar", type: "number", required: true, placeholder: "1000" },
      { name: "from", label: "From Currency", labelTr: "Kaynak Para Birimi", type: "select", required: true, options: ["TRY", "USD", "EUR", "GBP", "CHF", "JPY", "SAR", "AED"] },
      { name: "to", label: "To Currency", labelTr: "Hedef Para Birimi", type: "select", required: true, options: ["TRY", "USD", "EUR", "GBP", "CHF", "JPY", "SAR", "AED"] },
    ],
    keywords: ["döviz", "kur", "currency", "convert", "TL", "USD", "EUR", "TCMB"],
    execute: async (params) => {
      const { amount, from, to } = params;
      if (!amount || !from || !to) return { success: false, output: null, error: "Amount, from and to currencies required" };
      if (from === to) return { success: true, output: { amount, from, to, result: amount, rate: 1 } };
      try {
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/" + from, { signal: AbortSignal.timeout(10000) });
        const data = await response.json();
        const rate = data.rates?.[to];
        if (!rate) return { success: false, output: null, error: `Rate not found for ${from}→${to}` };
        return { success: true, output: { amount, from, to, result: Number((amount * rate).toFixed(2)), rate: Number(rate.toFixed(6)) } };
      } catch (e: any) {
        return { success: false, output: null, error: `Exchange rate fetch failed: ${e.message}` };
      }
    },
  },

  date_calculator: {
    name: "date_calculator",
    nameTr: "Tarih Hesaplayıcı",
    description: "Calculate date differences, add/subtract days, business days",
    descriptionTr: "Tarih farkı hesapla, gün ekle/çıkar, iş günü hesapla",
    category: "calculation",
    icon: "Calendar",
    parameters: [
      { name: "operation", label: "Operation", labelTr: "İşlem", type: "select", required: true, options: ["diff", "add", "subtract", "business_days", "format"] },
      { name: "date1", label: "Date 1", labelTr: "Tarih 1", type: "string", required: true, placeholder: "2026-01-15" },
      { name: "date2", label: "Date 2 / Days", labelTr: "Tarih 2 / Gün Sayısı", type: "string", required: false, placeholder: "2026-03-15 veya 30" },
      { name: "format", label: "Output Format", labelTr: "Çıktı Formatı", type: "select", required: false, options: ["iso", "tr", "us", "eu"], defaultValue: "tr" },
    ],
    keywords: ["tarih", "date", "gün", "day", "fark", "difference", "iş günü", "business day"],
    execute: async (params) => {
      const { operation, date1, date2, format = "tr" } = params;
      if (!date1) return { success: false, output: null, error: "Date1 is required" };
      const d1 = new Date(date1);
      if (isNaN(d1.getTime())) return { success: false, output: null, error: "Invalid date1" };

      if (operation === "diff") {
        const d2 = new Date(date2 || new Date().toISOString());
        if (isNaN(d2.getTime())) return { success: false, output: null, error: "Invalid date2" };
        const diffMs = d2.getTime() - d1.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return { success: true, output: { days, weeks: Math.floor(days / 7), months: Math.floor(days / 30), date1: d1.toISOString(), date2: d2.toISOString() } };
      }

      if (operation === "add" || operation === "subtract") {
        const daysToAdd = parseInt(date2 || "0");
        if (isNaN(daysToAdd)) return { success: false, output: null, error: "Days must be a number" };
        const result = new Date(d1);
        result.setDate(result.getDate() + (operation === "subtract" ? -daysToAdd : daysToAdd));
        return { success: true, output: { original: d1.toISOString(), result: result.toISOString(), daysAdded: operation === "subtract" ? -daysToAdd : daysToAdd } };
      }

      if (operation === "business_days") {
        const targetDays = parseInt(date2 || "0");
        if (isNaN(targetDays)) return { success: false, output: null, error: "Days must be a number" };
        let count = 0;
        const result = new Date(d1);
        while (count < targetDays) {
          result.setDate(result.getDate() + 1);
          const dow = result.getDay();
          if (dow !== 0 && dow !== 6) count++;
        }
        return { success: true, output: { start: d1.toISOString(), result: result.toISOString(), businessDays: targetDays } };
      }

      if (operation === "format") {
        const formatters: Record<string, string> = {
          iso: d1.toISOString(),
          tr: d1.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" }),
          us: d1.toLocaleDateString("en-US"),
          eu: d1.toLocaleDateString("de-DE"),
        };
        return { success: true, output: { formatted: formatters[format] || d1.toISOString(), format } };
      }

      return { success: false, output: null, error: "Unknown operation" };
    },
  },

  regex_extract: {
    name: "regex_extract",
    nameTr: "Regex Veri Çıkarma",
    description: "Extract data from text using regular expressions",
    descriptionTr: "Düzenli ifadeler (regex) kullanarak metinden veri çıkarır",
    category: "data_processing",
    icon: "Code",
    parameters: [
      { name: "text", label: "Text", labelTr: "Metin", type: "text", required: true, placeholder: "Kaynak metin..." },
      { name: "pattern", label: "Regex Pattern", labelTr: "Regex Deseni", type: "string", required: true, placeholder: "\\d{3}-\\d{4}" },
      { name: "flags", label: "Flags", labelTr: "Bayraklar", type: "string", required: false, defaultValue: "gi", placeholder: "gi" },
    ],
    keywords: ["regex", "pattern", "extract", "çıkar", "desen", "düzenli ifade", "parse"],
    execute: async (params) => {
      const { text, pattern, flags = "gi" } = params;
      if (!text || !pattern) return { success: false, output: null, error: "Text and pattern required" };
      try {
        const regex = new RegExp(pattern, flags);
        const matches = [...text.matchAll(regex)].map(m => ({ match: m[0], groups: m.slice(1), index: m.index }));
        return { success: true, output: { matches, matchCount: matches.length, pattern } };
      } catch (e: any) {
        return { success: false, output: null, error: `Invalid regex: ${e.message}` };
      }
    },
  },

  csv_parse: {
    name: "csv_parse",
    nameTr: "CSV İşleme",
    description: "Parse CSV text into structured data or convert data to CSV",
    descriptionTr: "CSV metnini yapılandırılmış veriye çevirir veya veriyi CSV'ye dönüştürür",
    category: "data_processing",
    icon: "Table",
    parameters: [
      { name: "csvText", label: "CSV Text", labelTr: "CSV Metni", type: "text", required: true, placeholder: "ad,soyad,email\nAli,Yılmaz,ali@test.com" },
      { name: "delimiter", label: "Delimiter", labelTr: "Ayırıcı", type: "select", required: false, defaultValue: ",", options: [",", ";", "\t", "|"] },
      { name: "hasHeader", label: "Has Header Row", labelTr: "Başlık Satırı Var", type: "boolean", required: false, defaultValue: true },
    ],
    keywords: ["csv", "parse", "tablo", "table", "veri", "data", "ayrıştır"],
    execute: async (params) => {
      const { csvText, delimiter = ",", hasHeader = true } = params;
      if (!csvText) return { success: false, output: null, error: "CSV text is required" };
      const lines = csvText.trim().split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length === 0) return { success: false, output: null, error: "Empty CSV" };

      if (hasHeader) {
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ""));
        const rows = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });
          return row;
        });
        return { success: true, output: { headers, rows, rowCount: rows.length } };
      }

      const rows = lines.map(line => line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, "")));
      return { success: true, output: { rows, rowCount: rows.length } };
    },
  },

  json_transform: {
    name: "json_transform",
    nameTr: "JSON Dönüştürücü",
    description: "Transform, filter, or restructure JSON data",
    descriptionTr: "JSON verisini dönüştür, filtrele veya yeniden yapılandır",
    category: "data_processing",
    icon: "Braces",
    parameters: [
      { name: "jsonData", label: "JSON Data", labelTr: "JSON Verisi", type: "text", required: true, placeholder: '{"key": "value"}' },
      { name: "operation", label: "Operation", labelTr: "İşlem", type: "select", required: true, options: ["pick_fields", "flatten", "filter_array", "count", "sort", "group_by"] },
      { name: "fields", label: "Fields (comma-separated)", labelTr: "Alanlar (virgülle ayır)", type: "string", required: false, placeholder: "name,email,company" },
      { name: "filterField", label: "Filter Field", labelTr: "Filtre Alanı", type: "string", required: false, placeholder: "status" },
      { name: "filterValue", label: "Filter Value", labelTr: "Filtre Değeri", type: "string", required: false, placeholder: "active" },
    ],
    keywords: ["json", "transform", "dönüştür", "filtre", "filter", "map", "veri"],
    execute: async (params) => {
      const { jsonData, operation, fields, filterField, filterValue } = params;
      if (!jsonData) return { success: false, output: null, error: "JSON data required" };
      let data: any;
      try { data = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData; } catch { return { success: false, output: null, error: "Invalid JSON" }; }

      if (operation === "pick_fields" && fields) {
        const fieldList = fields.split(",").map((f: string) => f.trim());
        if (Array.isArray(data)) {
          return { success: true, output: { result: data.map((item: any) => { const picked: any = {}; fieldList.forEach(f => { if (item[f] !== undefined) picked[f] = item[f]; }); return picked; }) } };
        }
        const picked: any = {};
        fieldList.forEach(f => { if (data[f] !== undefined) picked[f] = data[f]; });
        return { success: true, output: { result: picked } };
      }

      if (operation === "filter_array" && filterField) {
        if (!Array.isArray(data)) return { success: false, output: null, error: "Data must be an array for filter" };
        const filtered = data.filter((item: any) => String(item[filterField]) === String(filterValue));
        return { success: true, output: { result: filtered, filteredCount: filtered.length, originalCount: data.length } };
      }

      if (operation === "count") {
        if (Array.isArray(data)) return { success: true, output: { count: data.length } };
        return { success: true, output: { count: Object.keys(data).length, type: "object" } };
      }

      if (operation === "sort" && fields && Array.isArray(data)) {
        const sortField = fields.split(",")[0].trim();
        const sorted = [...data].sort((a, b) => String(a[sortField]).localeCompare(String(b[sortField])));
        return { success: true, output: { result: sorted } };
      }

      if (operation === "flatten") {
        const flat: Record<string, any> = {};
        const flatten = (obj: any, prefix = "") => {
          for (const [k, v] of Object.entries(obj)) {
            const key = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key);
            else flat[key] = v;
          }
        };
        flatten(data);
        return { success: true, output: { result: flat } };
      }

      if (operation === "group_by" && fields && Array.isArray(data)) {
        const groupField = fields.split(",")[0].trim();
        const groups: Record<string, any[]> = {};
        data.forEach((item: any) => {
          const key = String(item[groupField] ?? "unknown");
          if (!groups[key]) groups[key] = [];
          groups[key].push(item);
        });
        return { success: true, output: { groups, groupCount: Object.keys(groups).length } };
      }

      return { success: true, output: { result: data } };
    },
  },

  email_parser: {
    name: "email_parser",
    nameTr: "E-posta Ayrıştırıcı",
    description: "Parse and extract information from email content",
    descriptionTr: "E-posta içeriğinden bilgi çıkarır ve ayrıştırır",
    category: "communication",
    icon: "Mail",
    parameters: [
      { name: "emailContent", label: "Email Content", labelTr: "E-posta İçeriği", type: "text", required: true, placeholder: "E-posta metni..." },
      { name: "extractType", label: "Extract Type", labelTr: "Çıkarma Türü", type: "select", required: false, defaultValue: "all", options: ["all", "contacts", "dates", "amounts", "links", "phone_numbers"] },
    ],
    keywords: ["email", "e-posta", "parse", "ayrıştır", "extract", "çıkar"],
    execute: async (params) => {
      const { emailContent, extractType = "all" } = params;
      if (!emailContent) return { success: false, output: null, error: "Email content required" };

      const emailRegex = /[\w.+-]+@[\w-]+\.[\w.]+/gi;
      const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2,4}/g;
      const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
      const amountRegex = /(?:₺|TL|\$|€|£|USD|EUR|GBP)\s*[\d.,]+|[\d.,]+\s*(?:₺|TL|\$|€|£|USD|EUR|GBP)/gi;
      const dateRegex = /\d{1,2}[./\-]\d{1,2}[./\-]\d{2,4}|\d{4}[./\-]\d{1,2}[./\-]\d{1,2}/g;

      const result: Record<string, any> = {};
      if (extractType === "all" || extractType === "contacts") result.emails = [...new Set(emailContent.match(emailRegex) || [])];
      if (extractType === "all" || extractType === "phone_numbers") result.phones = [...new Set(emailContent.match(phoneRegex) || [])];
      if (extractType === "all" || extractType === "links") result.links = [...new Set(emailContent.match(urlRegex) || [])];
      if (extractType === "all" || extractType === "amounts") result.amounts = [...new Set(emailContent.match(amountRegex) || [])];
      if (extractType === "all" || extractType === "dates") result.dates = [...new Set(emailContent.match(dateRegex) || [])];

      return { success: true, output: result };
    },
  },

  template_render: {
    name: "template_render",
    nameTr: "Şablon Oluşturucu",
    description: "Render text templates with variable substitution",
    descriptionTr: "Değişken değiştirme ile metin şablonları oluşturur",
    category: "utility",
    icon: "FileEdit",
    parameters: [
      { name: "template", label: "Template", labelTr: "Şablon", type: "text", required: true, placeholder: "Sayın {{name}}, {{company}} adına..." },
      { name: "variables", label: "Variables (JSON)", labelTr: "Değişkenler (JSON)", type: "text", required: true, placeholder: '{"name": "Ali", "company": "Acme"}' },
    ],
    keywords: ["şablon", "template", "render", "oluştur", "değişken", "variable"],
    execute: async (params) => {
      const { template, variables } = params;
      if (!template) return { success: false, output: null, error: "Template required" };
      let vars: Record<string, any> = {};
      try { vars = typeof variables === "string" ? JSON.parse(variables) : (variables || {}); } catch { return { success: false, output: null, error: "Invalid variables JSON" }; }
      const rendered = template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`);
      const missing = [...template.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]).filter(k => vars[k] === undefined);
      return { success: true, output: { rendered, missingVariables: missing } };
    },
  },

  web_scrape: {
    name: "web_scrape",
    nameTr: "Web Kazıma",
    description: "Fetch and extract text content from a web URL",
    descriptionTr: "Web URL'sinden metin içeriği çeker ve çıkarır",
    category: "data_processing",
    icon: "Globe",
    parameters: [
      { name: "url", label: "URL", labelTr: "URL", type: "string", required: true, placeholder: "https://example.com" },
      { name: "selector", label: "CSS Selector", labelTr: "CSS Seçici", type: "string", required: false, placeholder: "article, .content, main" },
    ],
    keywords: ["web", "scrape", "kazı", "fetch", "url", "sayfa", "page", "site"],
    execute: async (params) => {
      const { url } = params;
      if (!url) return { success: false, output: null, error: "URL required" };
      try {
        const blockReason = isBlockedUrl(url);
        if (blockReason) return { success: false, output: null, error: blockReason };
        const response = await fetch(url, {
          headers: { "User-Agent": "RentAI-SkillBot/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        const html = await response.text();
        const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 10000);
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        return { success: true, output: { url, title: titleMatch?.[1] || "", text, textLength: text.length } };
      } catch (e: any) {
        return { success: false, output: null, error: `Fetch failed: ${e.message}` };
      }
    },
  },

  text_classify: {
    name: "text_classify",
    nameTr: "Metin Sınıflandırma",
    description: "Classify text into predefined categories using AI",
    descriptionTr: "AI kullanarak metni önceden tanımlı kategorilere sınıflandırır",
    category: "ai_powered",
    icon: "Layers",
    parameters: [
      { name: "text", label: "Text", labelTr: "Metin", type: "text", required: true, placeholder: "Sınıflandırılacak metin..." },
      { name: "categories", label: "Categories (comma-separated)", labelTr: "Kategoriler (virgülle ayır)", type: "string", required: true, placeholder: "satış,destek,şikayet,bilgi talebi" },
    ],
    keywords: ["sınıfla", "classify", "kategori", "category", "sınıflandır", "tür"],
    execute: async (params) => {
      const { text, categories } = params;
      if (!text || !categories) return { success: false, output: null, error: "Text and categories required" };
      const categoryList = categories.split(",").map((c: string) => c.trim());
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Classify the text into one of these categories: ${categoryList.join(", ")}. Return JSON: {"category": "chosen_category", "confidence": 0.0-1.0, "reasoning": "brief explanation in Turkish"}` },
          { role: "user", content: text.substring(0, 4000) },
        ],
        max_tokens: 200,
        response_format: { type: "json_object" },
      });
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      return { success: true, output: result };
    },
  },

  data_enrichment: {
    name: "data_enrichment",
    nameTr: "Veri Zenginleştirme",
    description: "Enrich data records with AI-generated insights",
    descriptionTr: "AI üretimi içgörülerle veri kayıtlarını zenginleştirir",
    category: "ai_powered",
    icon: "Sparkles",
    parameters: [
      { name: "data", label: "Data (JSON)", labelTr: "Veri (JSON)", type: "text", required: true, placeholder: '{"company": "Acme Corp", "industry": "tech"}' },
      { name: "enrichFields", label: "Fields to Enrich", labelTr: "Zenginleştirilecek Alanlar", type: "string", required: true, placeholder: "company_size,likely_revenue,target_products" },
    ],
    keywords: ["zenginleştir", "enrich", "veri", "data", "insight", "analiz"],
    execute: async (params) => {
      const { data, enrichFields } = params;
      if (!data || !enrichFields) return { success: false, output: null, error: "Data and enrich fields required" };
      let parsedData: any;
      try { parsedData = typeof data === "string" ? JSON.parse(data) : data; } catch { return { success: false, output: null, error: "Invalid data JSON" }; }
      const fields = enrichFields.split(",").map((f: string) => f.trim());
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Given the data below, estimate/infer the following fields: ${fields.join(", ")}. Return a JSON object with these fields as keys and your best estimates as values. Include a "confidence" field (0-1) for each estimate. Be practical and business-focused.` },
          { role: "user", content: JSON.stringify(parsedData) },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      });
      const enriched = JSON.parse(response.choices[0]?.message?.content || "{}");
      return { success: true, output: { original: parsedData, enriched, fields } };
    },
  },

  generate_report: {
    name: "generate_report",
    nameTr: "Rapor Oluştur",
    description: "Generate a structured report from data using AI",
    descriptionTr: "AI kullanarak veriden yapılandırılmış rapor oluşturur",
    category: "ai_powered",
    icon: "FileBarChart",
    parameters: [
      { name: "data", label: "Data (JSON/text)", labelTr: "Veri (JSON/metin)", type: "text", required: true, placeholder: "Rapor verisi..." },
      { name: "reportType", label: "Report Type", labelTr: "Rapor Türü", type: "select", required: true, options: ["summary", "analysis", "comparison", "status", "forecast"] },
      { name: "language", label: "Language", labelTr: "Dil", type: "select", required: false, defaultValue: "tr", options: ["tr", "en"] },
    ],
    keywords: ["rapor", "report", "analiz", "analysis", "özet", "summary"],
    execute: async (params) => {
      const { data, reportType, language = "tr" } = params;
      if (!data || !reportType) return { success: false, output: null, error: "Data and report type required" };
      const typeLabels: Record<string, string> = { summary: "executive summary", analysis: "detailed analysis", comparison: "comparison report", status: "status report", forecast: "forecast/projection" };
      const langLabel = language === "tr" ? "Turkish" : "English";
      const response = await aiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Generate a ${typeLabels[reportType] || reportType} in ${langLabel} based on the provided data. Structure it with clear sections, key findings, and actionable insights. Return JSON: {"title": "...", "sections": [{"heading": "...", "content": "..."}], "keyFindings": ["..."], "recommendations": ["..."]}` },
          { role: "user", content: typeof data === "string" ? data.substring(0, 6000) : JSON.stringify(data).substring(0, 6000) },
        ],
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });
      const report = JSON.parse(response.choices[0]?.message?.content || "{}");
      return { success: true, output: report };
    },
  },

  price_compare: {
    name: "price_compare",
    nameTr: "Fiyat Karşılaştırma",
    description: "Compare prices across items and calculate savings",
    descriptionTr: "Ürünler arası fiyat karşılaştırması yapar ve tasarruf hesaplar",
    category: "calculation",
    icon: "TrendingDown",
    parameters: [
      { name: "items", label: "Items (JSON array)", labelTr: "Ürünler (JSON dizisi)", type: "text", required: true, placeholder: '[{"name":"Ürün A","price":100},{"name":"Ürün B","price":85}]' },
      { name: "budget", label: "Budget", labelTr: "Bütçe", type: "number", required: false, placeholder: "1000" },
    ],
    keywords: ["fiyat", "price", "karşılaştır", "compare", "ucuz", "cheap", "tasarruf", "saving"],
    execute: async (params) => {
      const { items, budget } = params;
      if (!items) return { success: false, output: null, error: "Items required" };
      let parsedItems: any[];
      try { parsedItems = typeof items === "string" ? JSON.parse(items) : items; } catch { return { success: false, output: null, error: "Invalid items JSON" }; }
      if (!Array.isArray(parsedItems) || parsedItems.length === 0) return { success: false, output: null, error: "Items must be a non-empty array" };

      const sorted = [...parsedItems].sort((a, b) => (a.price || 0) - (b.price || 0));
      const cheapest = sorted[0];
      const mostExpensive = sorted[sorted.length - 1];
      const avgPrice = sorted.reduce((s, i) => s + (i.price || 0), 0) / sorted.length;
      const savings = mostExpensive.price - cheapest.price;
      const withinBudget = budget ? sorted.filter(i => i.price <= budget) : null;

      return {
        success: true,
        output: {
          cheapest, mostExpensive, avgPrice: Number(avgPrice.toFixed(2)),
          savings, savingsPercent: Number(((savings / mostExpensive.price) * 100).toFixed(1)),
          sorted,
          ...(withinBudget ? { withinBudget, withinBudgetCount: withinBudget.length } : {}),
        },
      };
    },
  },

  text_diff: {
    name: "text_diff",
    nameTr: "Metin Karşılaştırma",
    description: "Compare two texts and find differences",
    descriptionTr: "İki metni karşılaştırır ve farkları bulur",
    category: "text_analysis",
    icon: "GitCompare",
    parameters: [
      { name: "text1", label: "Text 1", labelTr: "Metin 1", type: "text", required: true, placeholder: "İlk metin..." },
      { name: "text2", label: "Text 2", labelTr: "Metin 2", type: "text", required: true, placeholder: "İkinci metin..." },
    ],
    keywords: ["karşılaştır", "compare", "fark", "diff", "difference", "değişiklik"],
    execute: async (params) => {
      const { text1, text2 } = params;
      if (!text1 || !text2) return { success: false, output: null, error: "Both texts required" };
      const words1 = text1.split(/\s+/);
      const words2 = text2.split(/\s+/);
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      const added = words2.filter(w => !set1.has(w));
      const removed = words1.filter(w => !set2.has(w));
      const common = words1.filter(w => set2.has(w));
      return {
        success: true,
        output: {
          identical: text1 === text2,
          text1WordCount: words1.length,
          text2WordCount: words2.length,
          addedWords: [...new Set(added)],
          removedWords: [...new Set(removed)],
          commonWordCount: [...new Set(common)].length,
          similarity: Number((([...new Set(common)].length / Math.max(set1.size, set2.size)) * 100).toFixed(1)),
        },
      };
    },
  },
  pdf_extract: {
    name: "pdf_extract",
    nameTr: "PDF Metin Çıkarma",
    description: "Extract text content from a PDF URL",
    descriptionTr: "PDF URL'sinden metin içeriğini çıkarır",
    category: "file_ops",
    icon: "FileText",
    parameters: [
      { name: "url", label: "PDF URL", labelTr: "PDF URL", type: "string", required: true, placeholder: "https://example.com/doc.pdf" },
    ],
    keywords: ["pdf", "belge", "document", "çıkar", "extract", "dosya", "file", "text"],
    execute: async (params) => {
      const { url } = params;
      if (!url) return { success: false, output: null, error: "PDF URL required" };
      const blockReason = isBlockedUrl(url);
      if (blockReason) return { success: false, output: null, error: blockReason };
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "RentAI-SkillBot/1.0" } });
        if (!response.ok) return { success: false, output: null, error: `HTTP ${response.status}` };
        const buffer = Buffer.from(await response.arrayBuffer());
        const textChunks: string[] = [];
        const content = buffer.toString("utf-8");
        const streamMatches = content.match(/stream\s*\n([\s\S]*?)\nendstream/g) || [];
        for (const stream of streamMatches) {
          const text = stream.replace(/stream\s*\n/, "").replace(/\nendstream/, "");
          const readable = text.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
          if (readable.length > 5) textChunks.push(readable);
        }
        const plainText = textChunks.join("\n").trim();
        if (!plainText) {
          return { success: true, output: { text: "[PDF content could not be extracted as plain text - may require OCR]", pageCount: streamMatches.length, rawLength: buffer.length } };
        }
        return { success: true, output: { text: plainText.substring(0, 10000), pageCount: streamMatches.length, rawLength: buffer.length, extractedLength: plainText.length } };
      } catch (e: any) {
        return { success: false, output: null, error: `PDF extraction failed: ${e.message}` };
      }
    },
  },
};

export async function executeSkill(
  skillId: number,
  params: Record<string, any>
): Promise<SkillExecutionResult> {
  const startTime = Date.now();

  const [skill] = await db.select().from(agentSkills).where(eq(agentSkills.id, skillId));
  if (!skill) return { success: false, output: null, error: "Skill not found", durationMs: Date.now() - startTime };
  if (!skill.isActive) return { success: false, output: null, error: "Skill is disabled", durationMs: Date.now() - startTime };

  let result: { success: boolean; output: any; error?: string };

  try {
    if (skill.isBuiltin && BUILTIN_SKILLS[skill.name]) {
      result = await BUILTIN_SKILLS[skill.name].execute(params);
    } else if (skill.skillType === "http") {
      result = await executeHttpSkill(skill, params);
    } else if (skill.skillType === "prompt") {
      result = await executePromptSkill(skill, params);
    } else if (skill.skillType === "expression") {
      result = await executeExpressionSkill(skill, params);
    } else {
      result = { success: false, output: null, error: `Unknown skill type: ${skill.skillType}` };
    }
  } catch (e: any) {
    result = { success: false, output: null, error: e.message };
  }

  const durationMs = Date.now() - startTime;

  await db
    .update(agentSkills)
    .set({
      usageCount: sql`${agentSkills.usageCount} + 1`,
      successCount: result.success ? sql`${agentSkills.successCount} + 1` : agentSkills.successCount,
      totalDurationMs: sql`${agentSkills.totalDurationMs} + ${durationMs}`,
    })
    .where(eq(agentSkills.id, skillId));

  return { ...result, durationMs };
}

export async function executeSkillByName(
  skillName: string,
  params: Record<string, any>,
  agentSlug?: string
): Promise<SkillExecutionResult> {
  const [skill] = await db.select().from(agentSkills).where(and(eq(agentSkills.name, skillName), eq(agentSkills.isActive, true)));
  if (!skill) {
    return { success: false, output: null, error: `Skill '${skillName}' not found or inactive`, durationMs: 0 };
  }
  if (agentSlug) {
    const [assignment] = await db.select().from(agentSkillAssignments)
      .where(and(eq(agentSkillAssignments.skillId, skill.id), eq(agentSkillAssignments.agentSlug, agentSlug), eq(agentSkillAssignments.isEnabled, true)));
    if (!assignment) {
      return { success: false, output: null, error: `Skill '${skillName}' not assigned to agent '${agentSlug}'`, durationMs: 0 };
    }
  }
  return executeSkill(skill.id, params);
}

export async function getSkillStats(): Promise<{ totalSkills: number; activeSkills: number; builtinSkills: number; customSkills: number; skillStats: Array<{ id: number; name: string; nameTr: string; usageCount: number; successCount: number; avgDurationMs: number; successRate: number }> }> {
  const allSkills = await db.select().from(agentSkills);
  const totalSkills = allSkills.length;
  const activeSkills = allSkills.filter(s => s.isActive).length;
  const builtinSkills = allSkills.filter(s => s.isBuiltin).length;
  const customSkills = allSkills.filter(s => !s.isBuiltin).length;
  const skillStats = allSkills.map(s => ({
    id: s.id, name: s.name, nameTr: s.nameTr,
    usageCount: s.usageCount ?? 0, successCount: s.successCount ?? 0,
    avgDurationMs: (s.usageCount && s.usageCount > 0) ? Math.round((s.totalDurationMs ?? 0) / s.usageCount) : 0,
    successRate: (s.usageCount && s.usageCount > 0) ? Math.round(((s.successCount ?? 0) / s.usageCount) * 100) : 0,
  }));
  return { totalSkills, activeSkills, builtinSkills, customSkills, skillStats };
}

async function executeHttpSkill(
  skill: AgentSkill,
  params: Record<string, any>
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = skill.config as any;
  if (!config.url) return { success: false, output: null, error: "HTTP skill has no URL configured" };

  let url = config.url;
  let body = config.body ? JSON.stringify(config.body) : undefined;

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    url = url.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), String(value));
    if (body) body = body.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), String(value));
  }

  const blockReason = isBlockedUrl(url);
  if (blockReason) return { success: false, output: null, error: blockReason };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.authType === "bearer" && config.authToken) {
    headers["Authorization"] = `Bearer ${config.authToken}`;
  } else if (config.authType === "api_key" && config.apiKeyHeader && config.apiKey) {
    headers[config.apiKeyHeader] = config.apiKey;
  }

  const response = await fetch(url, {
    method: config.method || "GET",
    headers,
    body: ["POST", "PUT", "PATCH"].includes(config.method || "GET") ? body : undefined,
    signal: AbortSignal.timeout(15000),
  });

  const responseText = await response.text().catch(() => "");
  let parsed: any;
  try { parsed = JSON.parse(responseText); } catch { parsed = responseText; }

  return { success: response.ok, output: parsed, error: response.ok ? undefined : `HTTP ${response.status}` };
}

async function executePromptSkill(
  skill: AgentSkill,
  params: Record<string, any>
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = skill.config as any;
  if (!config.systemPrompt && !config.userPromptTemplate) {
    return { success: false, output: null, error: "Prompt skill has no prompt configured" };
  }

  let userPrompt = config.userPromptTemplate || "{{input}}";
  for (const [key, value] of Object.entries(params)) {
    userPrompt = userPrompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  }

  const response = await aiClient.chat.completions.create({
    model: config.model || "gpt-4o-mini",
    messages: [
      ...(config.systemPrompt ? [{ role: "system" as const, content: config.systemPrompt }] : []),
      { role: "user" as const, content: userPrompt },
    ],
    max_tokens: config.maxTokens || 1000,
    ...(config.jsonOutput ? { response_format: { type: "json_object" as const } } : {}),
  });

  const content = response.choices[0]?.message?.content || "";
  let output: any = content;
  if (config.jsonOutput) { try { output = JSON.parse(content); } catch {} }

  return { success: true, output };
}

async function executeExpressionSkill(
  skill: AgentSkill,
  params: Record<string, any>
): Promise<{ success: boolean; output: any; error?: string }> {
  const config = skill.config as any;
  if (!config.expression) return { success: false, output: null, error: "Expression skill has no expression configured" };

  try {
    const result = await safeEvalExpression(config.expression, params);
    return { success: true, output: { result } };
  } catch (e: any) {
    return { success: false, output: null, error: `Expression error: ${e.message}` };
  }
}

export async function seedBuiltinSkills(): Promise<void> {
  for (const [name, def] of Object.entries(BUILTIN_SKILLS)) {
    const existing = await db.select().from(agentSkills).where(eq(agentSkills.name, name));
    if (existing.length === 0) {
      await db.insert(agentSkills).values({
        name: def.name,
        nameTr: def.nameTr,
        description: def.description,
        descriptionTr: def.descriptionTr,
        category: def.category,
        skillType: "builtin",
        icon: def.icon,
        config: {},
        parameters: def.parameters,
        keywords: def.keywords,
        isActive: true,
        isBuiltin: true,
      });
    }
  }
  console.log(`[SkillEngine] Seeded ${Object.keys(BUILTIN_SKILLS).length} built-in skills`);
}

export async function getSkillsForAgent(agentSlug: string): Promise<AgentSkill[]> {
  const assignments = await db
    .select({ skillId: agentSkillAssignments.skillId })
    .from(agentSkillAssignments)
    .where(and(eq(agentSkillAssignments.agentSlug, agentSlug), eq(agentSkillAssignments.isEnabled, true)));

  if (assignments.length === 0) return [];

  const skillIds = assignments.map(a => a.skillId);
  const skills = await db
    .select()
    .from(agentSkills)
    .where(and(eq(agentSkills.isActive, true)));

  return skills.filter(s => skillIds.includes(s.id));
}

export function skillToOpenAITool(skill: AgentSkill): OpenAI.ChatCompletionTool {
  const params = (skill.parameters as SkillParameter[]) || [];
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const p of params) {
    const prop: any = { description: p.labelTr || p.label };
    if (p.type === "string" || p.type === "text") prop.type = "string";
    else if (p.type === "number") prop.type = "number";
    else if (p.type === "boolean") prop.type = "boolean";
    else if (p.type === "select") { prop.type = "string"; if (p.options) prop.enum = p.options; }
    else if (p.type === "json") prop.type = "string";
    else prop.type = "string";

    if (p.placeholder) prop.description += ` (örn: ${p.placeholder})`;
    properties[p.name] = prop;
    if (p.required) required.push(p.name);
  }

  return {
    type: "function",
    function: {
      name: `skill_${skill.name}`,
      description: skill.descriptionTr || skill.description,
      parameters: {
        type: "object",
        properties,
        required,
      },
    },
  };
}
