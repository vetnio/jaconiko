"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

interface BookmarkedDashboard {
  id: string;
  title: string;
  createdAt: string;
  projectId: string;
  bookmarkedAt: string;
}

interface BookmarkedDashboardsProps {
  projectId: string;
  workspaceId: string;
}

export function BookmarkedDashboards({
  projectId,
  workspaceId,
}: BookmarkedDashboardsProps) {
  const [dashboards, setDashboards] = useState<BookmarkedDashboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBookmarks() {
      try {
        const res = await fetch("/api/bookmarks/dashboards");
        if (!res.ok) return;
        const all: BookmarkedDashboard[] = await res.json();
        setDashboards(all.filter((d) => d.projectId === projectId));
      } catch {
        // Silently fail — bookmarks are non-critical
      } finally {
        setLoading(false);
      }
    }

    fetchBookmarks();
  }, [projectId]);

  if (loading) return null;

  return (
    <div className="border-t border-[var(--border)] px-2 py-2">
      <p className="px-2 mb-1 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
        Dashboards
      </p>
      {dashboards.length === 0 ? (
        <p className="px-2 py-2 text-xs text-[var(--muted-foreground)]">
          No bookmarked dashboards
        </p>
      ) : (
        <div className="flex flex-col gap-0.5">
          {dashboards.map((d) => (
            <Link
              key={d.id}
              href={`/workspace/${workspaceId}/project/${projectId}/dashboard/${d.id}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-[var(--muted)]/50 transition-colors"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
              <span className="truncate">{d.title}</span>
              <span className="ml-auto text-[10px] text-[var(--muted-foreground)] shrink-0">
                {new Date(d.createdAt).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
