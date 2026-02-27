"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "var(--accent-foreground)",
];

interface BarChartConfig {
  xAxisKey?: string;
  dataKeys?: string[];
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  config?: BarChartConfig;
}

export function BarChart({ data, config = {} }: BarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">
        No data
      </div>
    );
  }

  const xAxisKey = config.xAxisKey ?? Object.keys(data[0])[0];
  const dataKeys =
    config.dataKeys ??
    Object.keys(data[0]).filter((k) => k !== xAxisKey);
  const colors = config.colors ?? CHART_COLORS;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
        />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          label={
            config.xAxisLabel
              ? {
                  value: config.xAxisLabel,
                  position: "insideBottom",
                  offset: -5,
                  fill: "var(--muted-foreground)",
                }
              : undefined
          }
        />
        <YAxis
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          label={
            config.yAxisLabel
              ? {
                  value: config.yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--muted-foreground)",
                }
              : undefined
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--card-foreground)",
          }}
        />
        {dataKeys.length > 1 && <Legend />}
        {dataKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[i % colors.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
