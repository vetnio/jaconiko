"use client";

import Link from "next/link";
import { FolderGit2, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
            <FolderGit2 className="h-6 w-6 text-[var(--accent-foreground)]" />
          </div>
          <p className="font-medium mb-1">No projects yet</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Connect a GitHub repo to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/workspace/${workspaceId}/project/${project.id}`}
          className="block p-4 border border-[var(--border)] rounded-lg hover:border-[var(--muted-foreground)] hover:shadow-md transition-all bg-[var(--card)]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4" />
              <span className="font-medium">{project.githubRepoFullName}</span>
            </div>
            <span className="text-xs text-[var(--success)] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Connected
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
