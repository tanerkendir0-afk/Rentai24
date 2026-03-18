import { AnalysisResult, groupByData, trendAnalysis, parseFile } from "./dataAnalysisService";

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "doughnut" | "scatter" | "area" | "horizontal_bar";
  title: string;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
    }[];
  };
  options?: {
    currency?: boolean;
    percentage?: boolean;
    stacked?: boolean;
  };
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6",
  "#06b6d4", "#84cc16", "#e879f9", "#fb923c", "#64748b",
];

export function suggestCharts(analysis: AnalysisResult): ChartConfig[] {
  const suggestions: ChartConfig[] = [];
  const { columns } = analysis.summary;

  const numCols = columns.filter(c => c.type === "number");
  const textCols = columns.filter(c => c.type === "text" && c.uniqueCount <= 20);
  const dateCols = columns.filter(c => c.type === "date");

  if (textCols.length > 0 && numCols.length > 0) {
    suggestions.push({
      type: "bar",
      title: `${textCols[0].name} bazında ${numCols[0].name}`,
      data: { labels: [], datasets: [] },
    });
  }

  if (dateCols.length > 0 && numCols.length > 0) {
    suggestions.push({
      type: "line",
      title: `${numCols[0].name} — Zaman Trendi`,
      data: { labels: [], datasets: [] },
    });
  }

  if (textCols.length > 0 && textCols[0].uniqueCount <= 8) {
    suggestions.push({
      type: "pie",
      title: `${textCols[0].name} Dağılımı`,
      data: { labels: [], datasets: [] },
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
): ChartConfig {
  const aggFunc = (config.aggregate || "sum") as "sum" | "avg" | "count" | "min" | "max";
  const grouped = groupByData(rawData, config.xColumn, config.yColumn, aggFunc);

  const labels = grouped.map(g => g.label);
  const data = grouped.map(g => g.value);
  const chartType = (config.type || "bar") as ChartConfig["type"];

  const bgColors = chartType === "pie" || chartType === "doughnut"
    ? labels.map((_, i) => COLORS[i % COLORS.length])
    : [COLORS[0]];

  return {
    type: chartType,
    title: config.title || `${config.xColumn} vs ${config.yColumn}`,
    data: {
      labels,
      datasets: [{
        label: config.yColumn,
        data,
        backgroundColor: bgColors,
      }],
    },
  };
}

export function createTrendChart(
  rawData: any[][],
  dateCol: string,
  valueCol: string,
  title?: string,
  period?: string
): ChartConfig {
  const result = trendAnalysis(rawData, dateCol, valueCol, (period || "monthly") as any);

  return {
    type: "line",
    title: title || `${valueCol} — Trend Analizi`,
    data: {
      labels: result.periods.map(p => p.period),
      datasets: [{
        label: valueCol,
        data: result.periods.map(p => p.value),
        backgroundColor: [COLORS[0]],
      }],
    },
  };
}
