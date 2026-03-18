import { AnalysisResult, groupByData, trendAnalysis } from "./dataAnalysisService";

export interface ChartSuggestion {
  type: string;
  title: string;
  xColumn: string;
  yColumn: string;
}

export interface RechartsConfig {
  type: "bar" | "line" | "pie" | "doughnut" | "scatter" | "area" | "horizontal_bar";
  title: string;
  data: Record<string, any>[];
  xKey: string;
  yKey: string;
  series?: { key: string; name: string; color?: string }[];
  colors?: string[];
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1",
];

export function suggestCharts(analysis: AnalysisResult): ChartSuggestion[] {
  const suggestions: ChartSuggestion[] = [];
  const { columns } = analysis.summary;

  const numCols = columns.filter(c => c.type === "number");
  const textCols = columns.filter(c => c.type === "text" && c.uniqueCount <= 20);
  const dateCols = columns.filter(c => c.type === "date");

  if (textCols.length > 0 && numCols.length > 0) {
    suggestions.push({
      type: "bar",
      title: `${textCols[0].name} bazında ${numCols[0].name}`,
      xColumn: textCols[0].name,
      yColumn: numCols[0].name,
    });
  }

  if (dateCols.length > 0 && numCols.length > 0) {
    suggestions.push({
      type: "line",
      title: `${numCols[0].name} — Zaman Trendi`,
      xColumn: dateCols[0].name,
      yColumn: numCols[0].name,
    });
  }

  if (textCols.length > 0 && textCols[0].uniqueCount <= 8) {
    suggestions.push({
      type: "pie",
      title: `${textCols[0].name} Dağılımı`,
      xColumn: textCols[0].name,
      yColumn: numCols.length > 0 ? numCols[0].name : "count",
    });
  }

  return suggestions;
}

export function createChartFromData(
  rawData: any[][],
  config: {
    type: string;
    xColumn: string;
    yColumn: string;
    groupColumn?: string;
    title?: string;
    aggregate?: string;
  }
): RechartsConfig {
  const aggFunc = (config.aggregate || "sum") as "sum" | "avg" | "count" | "min" | "max";
  const grouped = groupByData(rawData, config.xColumn, config.yColumn, aggFunc);

  const chartType = (config.type || "bar") as RechartsConfig["type"];
  const xKey = config.xColumn;
  const yKey = config.yColumn;

  const data = grouped.map(g => ({
    [xKey]: g.label,
    [yKey]: g.value,
  }));

  return {
    type: chartType,
    title: config.title || `${xKey} vs ${yKey}`,
    data,
    xKey,
    yKey,
    colors: COLORS,
  };
}

export function createTrendChart(
  rawData: any[][],
  dateCol: string,
  valueCol: string,
  title?: string,
  period?: string
): RechartsConfig {
  const result = trendAnalysis(rawData, dateCol, valueCol, (period || "monthly") as any);

  const data = result.periods.map(p => ({
    [dateCol]: p.period,
    [valueCol]: p.value,
  }));

  return {
    type: "line",
    title: title || `${valueCol} — Trend Analizi`,
    data,
    xKey: dateCol,
    yKey: valueCol,
    colors: COLORS,
  };
}
