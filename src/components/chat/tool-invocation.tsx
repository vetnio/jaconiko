"use client";

import { FolderSearch, FileText, Search, Loader2 } from "lucide-react";

interface ToolInvocationProps {
  toolName: string;
  state: "call" | "result" | "partial-call";
  args: Record<string, unknown>;
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
};

export function ToolInvocation({ toolName, state, args }: ToolInvocationProps) {
  const config = TOOL_CONFIG[toolName];
  if (!config) return null;

  const Icon = config.icon;
  const target = config.label(args);
  const isLoading = state === "call" || state === "partial-call";

  const verb = {
    listFiles: isLoading ? "Listing" : "Listed",
    readFile: isLoading ? "Reading" : "Read",
    searchCode: isLoading ? "Searching" : "Searched",
  }[toolName];

  return (
    <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] py-1">
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
      ) : (
        <Icon className="h-3 w-3 shrink-0" />
      )}
      <span className="truncate">
        {verb} {target}
      </span>
    </div>
  );
}
