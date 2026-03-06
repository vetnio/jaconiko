"use client";

import { BarChart } from "./bar-chart";
import { LineChart } from "./line-chart";
import { PieChart } from "./pie-chart";
import { DataTable } from "./data-table";
import { StatCard } from "./stat-card";

export interface WidgetData {
  type: "chart_bar" | "chart_line" | "chart_pie" | "data_table" | "stat_kpi";
  title: string;
  config?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
}

export function getChartData(
  widget: WidgetData
): Record<string, unknown>[] {
  const data = widget.data;
  if (!data) return [];
  // Direct array (shouldn't happen with z.record but handle it)
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  // { rows: [...] } format
  if (Array.isArray(data.rows)) return data.rows as Record<string, unknown>[];
  // { data: [...] } format
  if (Array.isArray(data.data)) return data.data as Record<string, unknown>[];
  // Fallback: find the first array value in the object
  for (const val of Object.values(data)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object" && val[0] !== null) {
      return val as Record<string, unknown>[];
    }
  }
  return [];
}

export function WidgetRenderer({ widget }: { widget: WidgetData }) {
  const chartData = getChartData(widget);
  const config = widget.config ?? {};

  switch (widget.type) {
    case "chart_bar":
      return (
        <BarChart
          data={chartData}
          config={config as React.ComponentProps<typeof BarChart>["config"]}
        />
      );
    case "chart_line":
      return (
        <LineChart
          data={chartData}
          config={config as React.ComponentProps<typeof LineChart>["config"]}
        />
      );
    case "chart_pie":
      return (
        <PieChart
          data={chartData}
          config={config as React.ComponentProps<typeof PieChart>["config"]}
        />
      );
    case "data_table":
      return (
        <DataTable
          data={chartData}
          config={config as React.ComponentProps<typeof DataTable>["config"]}
        />
      );
    case "stat_kpi": {
      const d = widget.data ?? {};
      return (
        <StatCard
          label={typeof d.label === "string" ? d.label : widget.title}
          value={
            typeof d.value === "string" || typeof d.value === "number"
              ? d.value
              : "—"
          }
          trend={
            d.trend &&
            typeof d.trend === "object" &&
            !Array.isArray(d.trend)
              ? (d.trend as { direction: "up" | "down" | "neutral"; text?: string })
              : undefined
          }
        />
      );
    }
    default:
      return (
        <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">
          Unknown widget type
        </div>
      );
  }
}
