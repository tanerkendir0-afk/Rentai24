import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import fs from "fs";
import path from "path";

export interface ColumnInfo {
  name: string;
  type: "number" | "text" | "date" | "boolean" | "mixed";
  sampleValues: any[];
  nullCount: number;
  uniqueCount: number;
}

export interface ColumnStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  sum?: number;
  stddev?: number;
  topValues?: { value: string; count: number }[];
}

export interface AnalysisResult {
  summary: {
    rowCount: number;
    columnCount: number;
    columns: ColumnInfo[];
  };
  statistics: Record<string, ColumnStats>;
  insights: string[];
}

export function parseFile(filePath: string): any[][] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv" || ext === ".tsv") {
    const content = fs.readFileSync(filePath, "utf-8");
    const result = Papa.parse(content, {
      header: false,
      skipEmptyLines: true,
      delimiter: ext === ".tsv" ? "\t" : undefined,
    });
    return result.data as any[][];
  }

  const workbook = XLSX.readFile(filePath, { type: "file" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
}

function detectType(values: any[]): "number" | "text" | "date" | "boolean" | "mixed" {
  const sample = values.filter(v => v != null && v !== "").slice(0, 100);
  if (sample.length === 0) return "text";

  let numCount = 0, dateCount = 0, boolCount = 0;
  for (const v of sample) {
    if (typeof v === "number" || (!isNaN(Number(v)) && v !== "")) numCount++;
    else if (typeof v === "boolean" || v === "true" || v === "false") boolCount++;
    else if (!isNaN(Date.parse(String(v))) && String(v).length > 5) dateCount++;
  }

  const total = sample.length;
  if (numCount / total > 0.8) return "number";
  if (dateCount / total > 0.8) return "date";
  if (boolCount / total > 0.8) return "boolean";
  if (numCount > 0 && dateCount > 0) return "mixed";
  return "text";
}

function toNumber(val: any): number | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[₺$€\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

export function analyzeData(rawData: any[][]): AnalysisResult {
  if (rawData.length < 2) {
    return { summary: { rowCount: 0, columnCount: 0, columns: [] }, statistics: {}, insights: ["Dosyada yeterli veri bulunamadı."] };
  }

  const headers = rawData[0].map(h => String(h || "").trim());
  const dataRows = rawData.slice(1);
  const columns: ColumnInfo[] = [];
  const statistics: Record<string, ColumnStats> = {};

  for (let col = 0; col < headers.length; col++) {
    const colName = headers[col] || `Kolon_${col + 1}`;
    const values = dataRows.map(row => row[col]);
    const nonNull = values.filter(v => v != null && v !== "");
    const colType = detectType(values);
    const uniqueSet = new Set(nonNull.map(v => String(v)));

    columns.push({
      name: colName,
      type: colType,
      sampleValues: nonNull.slice(0, 5),
      nullCount: values.length - nonNull.length,
      uniqueCount: uniqueSet.size,
    });

    if (colType === "number") {
      const nums = values.map(toNumber).filter(n => n !== null) as number[];
      if (nums.length > 0) {
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];
        const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length;

        statistics[colName] = {
          min: sorted[0],
          max: sorted[sorted.length - 1],
          mean: Math.round(mean * 100) / 100,
          median: Math.round(median * 100) / 100,
          sum: Math.round(sum * 100) / 100,
          stddev: Math.round(Math.sqrt(variance) * 100) / 100,
        };
      }
    } else if (colType === "text") {
      const freq: Record<string, number> = {};
      for (const v of nonNull) {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
      }
      const topValues = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));
      statistics[colName] = { topValues };
    }
  }

  const insights: string[] = [];
  for (const col of columns) {
    if (col.nullCount > dataRows.length * 0.3) {
      insights.push(`"${col.name}" kolonunda %${Math.round(col.nullCount / dataRows.length * 100)} boş değer var.`);
    }
    if (col.type === "number" && statistics[col.name]) {
      const s = statistics[col.name];
      if (s.stddev && s.mean && s.stddev > s.mean * 2) {
        insights.push(`"${col.name}" kolonunda yüksek varyans var (std: ${s.stddev?.toLocaleString("tr-TR")}).`);
      }
    }
  }

  return {
    summary: { rowCount: dataRows.length, columnCount: headers.length, columns },
    statistics,
    insights,
  };
}

export function groupByData(
  rawData: any[][],
  groupCol: string,
  aggCol: string,
  aggFunc: "sum" | "avg" | "count" | "min" | "max" = "sum"
): { label: string; value: number }[] {
  const headers = rawData[0].map(h => String(h || "").trim());
  const groupIdx = headers.indexOf(groupCol);
  const aggIdx = headers.indexOf(aggCol);
  if (groupIdx === -1) return [];

  const groups: Record<string, number[]> = {};
  for (let i = 1; i < rawData.length; i++) {
    const key = String(rawData[i][groupIdx] || "Bilinmiyor");
    if (!groups[key]) groups[key] = [];
    if (aggIdx !== -1) {
      const val = toNumber(rawData[i][aggIdx]);
      if (val !== null) groups[key].push(val);
    } else {
      groups[key].push(1);
    }
  }

  return Object.entries(groups).map(([label, vals]) => {
    let value: number;
    switch (aggFunc) {
      case "sum": value = vals.reduce((a, b) => a + b, 0); break;
      case "avg": value = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; break;
      case "count": value = vals.length; break;
      case "min": value = Math.min(...vals); break;
      case "max": value = Math.max(...vals); break;
      default: value = vals.reduce((a, b) => a + b, 0);
    }
    return { label, value: Math.round(value * 100) / 100 };
  }).sort((a, b) => b.value - a.value);
}

export function filterData(
  rawData: any[][],
  column: string,
  operator: string,
  filterValue: any
): any[][] {
  const headers = rawData[0].map(h => String(h || "").trim());
  const colIdx = headers.indexOf(column);
  if (colIdx === -1) return rawData;

  const filtered = [rawData[0]];
  for (let i = 1; i < rawData.length; i++) {
    const cellVal = rawData[i][colIdx];
    const numVal = toNumber(cellVal);
    const strVal = String(cellVal || "").toLowerCase();
    const filterNum = toNumber(filterValue);
    const filterStr = String(filterValue).toLowerCase();

    let match = false;
    switch (operator) {
      case "=": match = strVal === filterStr || (numVal !== null && filterNum !== null && numVal === filterNum); break;
      case "!=": match = strVal !== filterStr; break;
      case ">": match = numVal !== null && filterNum !== null && numVal > filterNum; break;
      case "<": match = numVal !== null && filterNum !== null && numVal < filterNum; break;
      case ">=": match = numVal !== null && filterNum !== null && numVal >= filterNum; break;
      case "<=": match = numVal !== null && filterNum !== null && numVal <= filterNum; break;
      case "contains": match = strVal.includes(filterStr); break;
      case "starts_with": match = strVal.startsWith(filterStr); break;
      default: match = true;
    }
    if (match) filtered.push(rawData[i]);
  }
  return filtered;
}

export function correlate(rawData: any[][], col1: string, col2: string): { correlation: number; interpretation: string } {
  const headers = rawData[0].map(h => String(h || "").trim());
  const idx1 = headers.indexOf(col1);
  const idx2 = headers.indexOf(col2);
  if (idx1 === -1 || idx2 === -1) return { correlation: 0, interpretation: "Kolon bulunamadı." };

  const pairs: [number, number][] = [];
  for (let i = 1; i < rawData.length; i++) {
    const v1 = toNumber(rawData[i][idx1]);
    const v2 = toNumber(rawData[i][idx2]);
    if (v1 !== null && v2 !== null) pairs.push([v1, v2]);
  }

  if (pairs.length < 3) return { correlation: 0, interpretation: "Yetersiz veri." };

  const n = pairs.length;
  const sumX = pairs.reduce((s, p) => s + p[0], 0);
  const sumY = pairs.reduce((s, p) => s + p[1], 0);
  const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0);
  const sumX2 = pairs.reduce((s, p) => s + p[0] ** 2, 0);
  const sumY2 = pairs.reduce((s, p) => s + p[1] ** 2, 0);

  const denom = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  if (denom === 0) return { correlation: 0, interpretation: "Korelasyon hesaplanamadı." };

  const r = Math.round(((n * sumXY - sumX * sumY) / denom) * 1000) / 1000;
  let interpretation: string;
  const abs = Math.abs(r);
  if (abs > 0.8) interpretation = r > 0 ? "Güçlü pozitif korelasyon" : "Güçlü negatif korelasyon";
  else if (abs > 0.5) interpretation = r > 0 ? "Orta düzeyde pozitif korelasyon" : "Orta düzeyde negatif korelasyon";
  else if (abs > 0.3) interpretation = "Zayıf korelasyon";
  else interpretation = "Anlamlı bir korelasyon yok";

  return { correlation: r, interpretation };
}

export function trendAnalysis(
  rawData: any[][],
  dateCol: string,
  valueCol: string,
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" = "monthly"
): { trend: string; change: number; periods: { period: string; value: number }[] } {
  const headers = rawData[0].map(h => String(h || "").trim());
  const dateIdx = headers.indexOf(dateCol);
  const valIdx = headers.indexOf(valueCol);
  if (dateIdx === -1 || valIdx === -1) return { trend: "Kolon bulunamadı", change: 0, periods: [] };

  const buckets: Record<string, number[]> = {};
  for (let i = 1; i < rawData.length; i++) {
    const dateStr = String(rawData[i][dateIdx] || "");
    const val = toNumber(rawData[i][valIdx]);
    if (!dateStr || val === null) continue;

    let d: Date;
    if (typeof rawData[i][dateIdx] === "number") {
      d = new Date((rawData[i][dateIdx] - 25569) * 86400 * 1000);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) continue;

    let key: string;
    switch (period) {
      case "daily": key = d.toISOString().split("T")[0]; break;
      case "weekly": {
        const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
        key = `${d.getFullYear()}-W${week.toString().padStart(2, "0")}`; break;
      }
      case "monthly": key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`; break;
      case "quarterly": key = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`; break;
      case "yearly": key = String(d.getFullYear()); break;
    }
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(val);
  }

  const periods = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, vals]) => ({ period: p, value: Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100 }));

  if (periods.length < 2) return { trend: "Yetersiz periyot", change: 0, periods };

  const first = periods[0].value;
  const last = periods[periods.length - 1].value;
  const change = first !== 0 ? Math.round((last - first) / Math.abs(first) * 10000) / 100 : 0;
  const trend = change > 5 ? "Yükseliş" : change < -5 ? "Düşüş" : "Yatay";

  return { trend, change, periods };
}

export function detectAnomalies(
  rawData: any[][],
  column: string,
  sensitivity: "low" | "medium" | "high" = "medium"
): { anomalies: { row: number; value: number }[]; threshold: number; mean: number; stddev: number } {
  const headers = rawData[0].map(h => String(h || "").trim());
  const colIdx = headers.indexOf(column);
  if (colIdx === -1) return { anomalies: [], threshold: 0, mean: 0, stddev: 0 };

  const values: { row: number; value: number }[] = [];
  for (let i = 1; i < rawData.length; i++) {
    const v = toNumber(rawData[i][colIdx]);
    if (v !== null) values.push({ row: i + 1, value: v });
  }

  if (values.length < 5) return { anomalies: [], threshold: 0, mean: 0, stddev: 0 };

  const nums = values.map(v => v.value);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const stddev = Math.sqrt(nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length);

  const zThreshold = sensitivity === "low" ? 3 : sensitivity === "medium" ? 2 : 1.5;
  const anomalies = values.filter(v => Math.abs(v.value - mean) > zThreshold * stddev);

  return {
    anomalies: anomalies.slice(0, 20),
    threshold: Math.round(zThreshold * stddev * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    stddev: Math.round(stddev * 100) / 100,
  };
}

export function formatTR(n: number): string {
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
