"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { WidgetRenderer, type WidgetData } from "@/components/dashboard/widget-renderer";

interface InlineDashboardProps {
  result: Record<string, unknown>;
}

export function InlineDashboard({ result }: InlineDashboardProps) {
  const title = (result.message as string) || "Dashboard";
  const widgets = Array.isArray(result.widgets) ? (result.widgets as WidgetData[]) : [];
  const url = result.url as string | undefined;

  if (widgets.length === 0) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
          <LayoutDashboard className="h-4 w-4 text-[var(--muted-foreground)]" />
          {title}
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
        {widgets.map((widget, i) => (
          <div key={i}>
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
