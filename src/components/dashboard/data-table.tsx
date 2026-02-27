"use client";

import { useState, useMemo } from "react";

interface DataTableConfig {
  columns?: { key: string; label: string }[];
}

interface DataTableProps {
  data: Record<string, unknown>[];
  config?: DataTableConfig;
}

type SortDirection = "asc" | "desc";

export function DataTable({ data, config = {} }: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const columns = useMemo(
    () =>
      data && data.length > 0
        ? (config.columns ??
          Object.keys(data[0]).map((key) => ({ key, label: key })))
        : [],
    [data, config.columns]
  );

  const sortedData = useMemo(() => {
    if (!data || data.length === 0 || !sortKey) return data ?? [];
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [data, sortKey, sortDir]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted-foreground)]">
        No data
      </div>
    );
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)] cursor-pointer select-none hover:text-[var(--foreground)] transition-colors"
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="text-xs">
                      {sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--muted)]/50 transition-colors"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-3 text-[var(--foreground)]"
                >
                  {row[col.key] != null ? String(row[col.key]) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
