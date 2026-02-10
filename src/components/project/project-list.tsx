"use client";

import Link from "next/link";
import { FolderGit2, CheckCircle2 } from "lucide-react";

interface Project {
  id: string;
  githubRepoFullName: string;
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-[var(--muted-foreground)]" />
              <span className="font-medium">{project.githubRepoFullName}</span>
            </div>
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
