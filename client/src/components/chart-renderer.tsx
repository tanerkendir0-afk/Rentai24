import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1",
];

interface ChartConfig {
  type: string;
  title: string;
  data: Array<Record<string, any>>;
  xKey?: string;
  yKey?: string;
  series?: Array<{ key: string; name: string; color?: string }>;
  colors?: string[];
}

function formatValue(val: any): string {
  if (typeof val === "number") {
    return val.toLocaleString("tr-TR");
  }
  return String(val ?? "");
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium mb-1 text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-semibold">{formatValue(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function ChartRenderer({ config }: { config: ChartConfig }) {
  const { type, title, data, xKey, yKey, series } = config;
  const chartColors = config.colors || COLORS;

  const chartContent = useMemo(() => {
    const commonAxisProps = {
      tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
      tickLine: false,
      axisLine: { stroke: "hsl(var(--border))", strokeWidth: 0.5 },
    };

    if (type === "pie" || type === "doughnut") {
      const nameKey = xKey || Object.keys(data[0] || {})[0];
      const valKey = yKey || Object.keys(data[0] || {})[1];
      return (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey={valKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={type === "doughnut" ? 55 : 0}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 0.5 }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={chartColors[i % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (type === "scatter") {
      return (
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
            <XAxis dataKey={xKey} name={xKey} {...commonAxisProps} />
            <YAxis dataKey={yKey} name={yKey} {...commonAxisProps} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={data} fill={chartColors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (type === "horizontal_bar") {
      return (
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 35)}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} horizontal={false} />
            <XAxis type="number" {...commonAxisProps} />
            <YAxis type="category" dataKey={xKey} width={75} {...commonAxisProps} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            {(series || [{ key: yKey || "value", name: yKey || "value" }]).map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || chartColors[i % chartColors.length]} radius={[0, 4, 4, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    const ChartComponent = type === "area" ? AreaChart : type === "line" ? LineChart : BarChart;
    const DataComponent = type === "area" ? Area : type === "line" ? Line : Bar;

    const seriesList = series || [{ key: yKey || "value", name: yKey || "value" }];

    return (
      <ResponsiveContainer width="100%" height={280}>
        <ChartComponent data={data} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
          <Tooltip content={<CustomTooltip />} />
          {seriesList.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {seriesList.map((s, i) => {
            const color = s.color || chartColors[i % chartColors.length];
            if (type === "area") {
              return <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={2} />;
            }
            if (type === "line") {
              return <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />;
            }
            return <Bar key={s.key} dataKey={s.key} name={s.name} fill={color} radius={[4, 4, 0, 0]} />;
          })}
        </ChartComponent>
      </ResponsiveContainer>
    );
  }, [type, data, xKey, yKey, series, chartColors]);

  return (
    <div className="my-3 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden" data-testid="chart-container">
      <div className="px-4 py-2.5 border-b border-border/30 bg-muted/30">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </div>
      <div className="px-2 py-3">
        {chartContent}
      </div>
    </div>
  );
}
