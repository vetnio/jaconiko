"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";

interface IndexingProgressProps {
  projectId: string;
  workspaceId: string;
  initialStatus: string;
  initialProgress: number;
}

export function IndexingProgress({
  projectId,
  workspaceId,
  initialStatus,
  initialProgress,
}: IndexingProgressProps) {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);

  useEffect(() => {
    if (status !== "indexing" && status !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/workspaces/${workspaceId}/projects`
        );
        const projects = await res.json();
        const project = projects.find(
          (p: { id: string }) => p.id === projectId
        );
        if (project) {
          setStatus(project.indexingStatus);
          setProgress(project.indexingProgress);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status, projectId, workspaceId]);

  if (status === "ready") {
    return (
      <p className="text-sm text-green-600">
        Codebase indexed and ready to chat
      </p>
    );
  }

  if (status === "failed") {
    return (
      <p className="text-sm text-[var(--destructive)]">
        Indexing failed. Try re-syncing.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-[var(--muted-foreground)]">
        {status === "pending" ? "Waiting to start indexing..." : `Indexing codebase... ${progress}%`}
      </p>
      <ProgressBar value={progress} />
    </div>
  );
}
