"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  Pencil,
  ChevronUp,
  ChevronDown,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { WidgetRenderer } from "@/components/dashboard/widget-renderer";

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

const WIDGET_TYPE_OPTIONS: {
  value: DashboardWidget["type"];
  label: string;
  group: "chart" | "other";
}[] = [
  { value: "chart_bar", label: "Bar Chart", group: "chart" },
  { value: "chart_line", label: "Line Chart", group: "chart" },
  { value: "chart_pie", label: "Pie Chart", group: "chart" },
  { value: "data_table", label: "Data Table", group: "other" },
  { value: "stat_kpi", label: "KPI Stat", group: "other" },
];

const COLOR_SCHEMES: { name: string; colors: string[] }[] = [
  {
    name: "Default",
    colors: [
      "var(--primary)",
      "var(--success)",
      "var(--warning)",
      "var(--destructive)",
      "var(--accent-foreground)",
    ],
  },
  {
    name: "Cool",
    colors: [
      "var(--primary)",
      "var(--accent-foreground)",
      "var(--muted-foreground)",
      "var(--secondary-foreground)",
      "var(--foreground)",
    ],
  },
  {
    name: "Warm",
    colors: [
      "var(--warning)",
      "var(--destructive)",
      "var(--primary)",
      "var(--success)",
      "var(--accent-foreground)",
    ],
  },
];

function EditWidgetCard({
  widget,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
}: {
  widget: DashboardWidget;
  index: number;
  total: number;
  onUpdate: (updated: DashboardWidget) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isChart = widget.type.startsWith("chart_");
  const currentColors =
    isChart && widget.config && Array.isArray(widget.config.colors)
      ? (widget.config.colors as string[])
      : undefined;
  const currentSchemeIndex = currentColors
    ? COLOR_SCHEMES.findIndex(
        (s) => JSON.stringify(s.colors) === JSON.stringify(currentColors)
      )
    : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={widget.title}
          onChange={(e) => onUpdate({ ...widget, title: e.target.value })}
          className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        />
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          Type
          <select
            value={widget.type}
            onChange={(e) =>
              onUpdate({
                ...widget,
                type: e.target.value as DashboardWidget["type"],
              })
            }
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
          >
            {WIDGET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {isChart && (
          <label className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            Colors
            <select
              value={currentSchemeIndex >= 0 ? currentSchemeIndex : 0}
              onChange={(e) => {
                const scheme = COLOR_SCHEMES[Number(e.target.value)];
                onUpdate({
                  ...widget,
                  config: { ...widget.config, colors: scheme.colors },
                });
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
            >
              {COLOR_SCHEMES.map((scheme, i) => (
                <option key={scheme.name} value={i}>
                  {scheme.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <WidgetRenderer widget={widget} />
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboardId as string;
  const toast = useToast();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editWidgets, setEditWidgets] = useState<DashboardWidget[]>([]);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    async function fetchBookmarkStatus() {
      try {
        const res = await fetch("/api/bookmarks/dashboards");
        if (!res.ok) return;
        const bookmarks: { dashboardId: string }[] = await res.json();
        setBookmarked(bookmarks.some((b) => b.dashboardId === dashboardId));
      } catch {
        // Silently fail — bookmark status is non-critical
      }
    }

    fetchBookmarkStatus();
  }, [dashboardId]);

  const toggleBookmark = useCallback(async () => {
    setBookmarkLoading(true);
    try {
      const method = bookmarked ? "DELETE" : "POST";
      const res = await fetch(`/api/dashboards/${dashboardId}/bookmark`, { method });
      if (!res.ok) {
        toast.error("Failed to update bookmark");
        return;
      }
      setBookmarked(!bookmarked);
      toast.success(bookmarked ? "Bookmark removed" : "Dashboard bookmarked");
    } catch {
      toast.error("Failed to update bookmark");
    } finally {
      setBookmarkLoading(false);
    }
  }, [bookmarked, dashboardId, toast]);

  const startEditing = useCallback(() => {
    if (!dashboard) return;
    setEditTitle(dashboard.title);
    setEditWidgets(dashboard.widgets.map((w) => ({ ...w })));
    setEditing(true);
  }, [dashboard]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditWidgets([]);
    setEditTitle("");
  }, []);

  const updateWidget = useCallback(
    (index: number, updated: DashboardWidget) => {
      setEditWidgets((prev) => {
        const next = [...prev];
        next[index] = updated;
        return next;
      });
    },
    []
  );

  const moveWidget = useCallback((index: number, direction: -1 | 1) => {
    setEditWidgets((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const saveChanges = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        title: editTitle,
        widgets: editWidgets.map((w, i) => ({
          id: w.id,
          type: w.type,
          title: w.title,
          config: w.config,
          data: w.data,
          position: i,
        })),
      };
      const res = await fetch(`/api/dashboards/${dashboardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Failed to save changes");
        return;
      }
      const updated = await res.json();
      setDashboard(updated);
      setEditing(false);
      toast.success("Dashboard saved");
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [editTitle, editWidgets, dashboardId, toast]);

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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-2xl font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          ) : (
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              {dashboard.title}
            </h1>
          )}
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Created {new Date(dashboard.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelEditing}
                disabled={saving}
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={saveChanges} loading={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
              <button
                onClick={toggleBookmark}
                disabled={bookmarkLoading}
                className="rounded-lg p-2 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:opacity-50"
                title={bookmarked ? "Remove bookmark" : "Bookmark dashboard"}
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-5 w-5 text-[var(--primary)]" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        editWidgets.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-[var(--muted-foreground)]">
            This dashboard has no widgets.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {editWidgets.map((widget, index) => (
              <EditWidgetCard
                key={widget.id}
                widget={widget}
                index={index}
                total={editWidgets.length}
                onUpdate={(updated) => updateWidget(index, updated)}
                onMoveUp={() => moveWidget(index, -1)}
                onMoveDown={() => moveWidget(index, 1)}
              />
            ))}
          </div>
        )
      ) : dashboard.widgets.length === 0 ? (
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
