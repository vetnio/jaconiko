"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/project/project-list";
import { ConnectRepo } from "@/components/project/connect-repo";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Settings, RefreshCw } from "lucide-react";

interface Project {
  id: string;
  githubRepoFullName: string;
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);

  function fetchProjects() {
    setError(null);
    fetch(`/api/workspaces/${workspaceId}/projects`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load projects");
        return res.json();
      })
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-7 w-28" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--destructive)] mb-4">{error}</p>
        <Button size="sm" onClick={fetchProjects}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Projects</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              router.push(`/workspace/${workspaceId}/settings`)
            }
          >
            <Settings className="h-4 w-4 mr-1" /> Settings
          </Button>
          <Button size="sm" onClick={() => setShowConnect(true)}>
            <Plus className="h-4 w-4 mr-1" /> Connect repo
          </Button>
        </div>
      </div>

      <ProjectList projects={projects} workspaceId={workspaceId} />

      <ConnectRepo
        workspaceId={workspaceId}
        open={showConnect}
        onClose={() => setShowConnect(false)}
        onConnected={fetchProjects}
      />
    </div>
  );
}
