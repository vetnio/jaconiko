"use client";

import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { FolderGit2 } from "lucide-react";

interface Project {
  id: string;
  githubRepoFullName: string;
  indexingStatus: string;
  indexingProgress: number;
  lastIndexedAt: string | null;
}

interface ProjectListProps {
  projects: Project[];
  workspaceId: string;
}

export function ProjectList({ projects, workspaceId }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-lg">
        <FolderGit2 className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
        <p className="text-[var(--muted-foreground)]">
          No projects yet. Connect a GitHub repo to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/workspace/${workspaceId}/project/${project.id}`}
          className="block p-4 border border-[var(--border)] rounded-lg hover:border-[var(--muted-foreground)] transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="font-medium">{project.githubRepoFullName}</span>
            </div>
            <StatusBadge status={project.indexingStatus} />
          </div>
          {project.indexingStatus === "indexing" && (
            <ProgressBar value={project.indexingProgress} />
          )}
        </Link>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    indexing: "bg-blue-100 text-blue-800",
    ready: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}
