"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { BarChart } from "@/components/dashboard/bar-chart";
import { LineChart } from "@/components/dashboard/line-chart";
import { PieChart } from "@/components/dashboard/pie-chart";
import { DataTable } from "@/components/dashboard/data-table";
import { StatCard } from "@/components/dashboard/stat-card";

interface DashboardWidget {
  id: string;
  type: "chart_bar" | "chart_line" | "chart_pie" | "data_table" | "stat_kpi";
  title: string;
  config: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  position: number;
}

interface Dashboard {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  widgets: DashboardWidget[];
}

function getChartData(
  widget: DashboardWidget
): Record<string, unknown>[] {
  const data = widget.data;
  if (!data) return [];
  // Support both { rows: [...] } and direct array stored as JSONB
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (Array.isArray(data.rows)) return data.rows as Record<string, unknown>[];
  return [];
}

function WidgetRenderer({ widget }: { widget: DashboardWidget }) {
  const chartData = getChartData(widget);
  // Config comes from JSONB — cast to each component's expected type
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

export default function DashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`/api/dashboards/${dashboardId}`);
        if (res.status === 404) {
          setError("Dashboard not found");
          return;
        }
        if (res.status === 403 || res.status === 401) {
          setError("You don't have access to this dashboard");
          return;
        }
        if (!res.ok) {
          setError("Failed to load dashboard");
          return;
        }
        const data = await res.json();
        setDashboard(data);
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-lg font-medium text-[var(--foreground)]">
          {error === "Dashboard not found" ? "404" : "Access Denied"}
        </p>
        <p className="text-[var(--muted-foreground)]">
          {error ?? "Dashboard not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {dashboard.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Created {new Date(dashboard.createdAt).toLocaleDateString()}
        </p>
      </div>

      {dashboard.widgets.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
          This dashboard has no widgets yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboard.widgets.map((widget) => (
            <div
              key={widget.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4"
            >
              {widget.type !== "stat_kpi" && (
                <h2 className="mb-3 text-sm font-medium text-[var(--muted-foreground)]">
                  {widget.title}
                </h2>
              )}
              <WidgetRenderer widget={widget} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
