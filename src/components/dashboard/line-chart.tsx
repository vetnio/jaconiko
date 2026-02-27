"use client";

import {
  LineChart as RechartsLineChart,
  Line,
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

interface LineChartConfig {
  xAxisKey?: string;
  dataKeys?: string[];
  colors?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  config?: LineChartConfig;
}

export function LineChart({ data, config = {} }: LineChartProps) {
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
      <RechartsLineChart data={data}>
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
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ fill: colors[i % colors.length], r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
