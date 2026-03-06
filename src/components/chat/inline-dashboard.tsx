"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { WidgetRenderer, type WidgetData } from "@/components/dashboard/widget-renderer";

interface InlineDashboardProps {
  result: Record<string, unknown>;
}

interface DashboardData {
  title: string;
  widgets: (WidgetData & { id: string })[];
}

export function InlineDashboard({ result }: InlineDashboardProps) {
  const dashboardId = result.dashboardId as string | undefined;
  const url = result.url as string | undefined;
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dashboardId) {
      setLoading(false);
      return;
    }

    fetch(`/api/dashboards/${dashboardId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.widgets)) {
          setDashboard(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dashboardId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 flex items-center justify-center">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (!dashboard || dashboard.widgets.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <LayoutDashboard className="h-4 w-4 text-[var(--muted-foreground)]" />
          {dashboard.title}
        </div>
        {url && (
          <Link
            href={url}
            className="text-xs text-[var(--primary)] hover:underline"
          >
            Open full dashboard
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3">
        {dashboard.widgets.map((widget) => (
          <div key={widget.id}>
            {widget.type !== "stat_kpi" && (
              <h3 className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                {widget.title}
              </h3>
            )}
            <WidgetRenderer widget={widget} />
          </div>
        ))}
      </div>
    </div>
  );
}
