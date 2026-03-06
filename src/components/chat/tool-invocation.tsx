"use client";

import Link from "next/link";
import { FolderSearch, FileText, Search, Database, LayoutDashboard, Loader2 } from "lucide-react";
import { WidgetRenderer, type WidgetData } from "@/components/dashboard/widget-renderer";

interface ToolInvocationProps {
  toolName: string;
  state: "call" | "result" | "partial-call";
  args: Record<string, unknown>;
  result?: unknown;
}

const TOOL_CONFIG: Record<
  string,
  { icon: typeof FolderSearch; label: (args: Record<string, unknown>) => string }
> = {
  listFiles: {
    icon: FolderSearch,
    label: (args) =>
      args.path ? `${args.path}/` : "repository root",
  },
  readFile: {
    icon: FileText,
    label: (args) => (args.filePath as string) || "file",
  },
  searchCode: {
    icon: Search,
    label: (args) => `"${args.query}"` || "code",
  },
  queryDatabase: {
    icon: Database,
    label: (args) => {
      const query = (args.query as string) || "database";
      // Show a truncated version of the SQL query
      return query.length > 60 ? `${query.slice(0, 60)}...` : query;
    },
  },
  createDashboard: {
    icon: LayoutDashboard,
    label: (args) => (args.title as string) || "dashboard",
  },
};

export function ToolInvocation({ toolName, state, args, result }: ToolInvocationProps) {
  const config = TOOL_CONFIG[toolName];
  if (!config) return null;

  const Icon = config.icon;
  const target = config.label(args);
  const isLoading = state === "call" || state === "partial-call";

  const verb: Record<string, string> = {
    listFiles: isLoading ? "Listing" : "Listed",
    readFile: isLoading ? "Reading" : "Read",
    searchCode: isLoading ? "Searching" : "Searched",
    queryDatabase: isLoading ? "Querying" : "Queried",
    createDashboard: isLoading ? "Creating" : "Created",
  };

  const displayVerb = verb[toolName];

  // Render inline dashboard when createDashboard completes
  if (toolName === "createDashboard" && state === "result" && result && typeof result === "object" && !("error" in result)) {
    const widgets = Array.isArray(args.widgets) ? (args.widgets as WidgetData[]) : [];
    const res = result as { url?: string; message?: string };

    return (
      <div className="py-1">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-2">
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{displayVerb} {target}</span>
        </div>
        {widgets.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {widgets.map((widget, i) => (
              <div
                key={i}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
              >
                {widget.type !== "stat_kpi" && (
                  <h3 className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                    {widget.title}
                  </h3>
                )}
                <WidgetRenderer widget={widget} />
              </div>
            ))}
          </div>
        )}
        {res.url && (
          <Link
            href={res.url}
            className="inline-block mt-2 text-xs text-[var(--primary)] hover:underline"
          >
            Open full dashboard
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] py-1">
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <Icon className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">
        {displayVerb} {target}
      </span>
    </div>
  );
}
