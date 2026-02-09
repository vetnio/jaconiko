"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IndexingProgress } from "@/components/project/indexing-progress";
import { Spinner } from "@/components/ui/spinner";
import { MessageSquare, Plus, ArrowLeft, RefreshCw, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}

interface Project {
  id: string;
  githubRepoFullName: string;
  indexingStatus: string;
  indexingProgress: number;
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [projectsRes, threadsRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/projects`),
        fetch(`/api/threads?projectId=${projectId}`),
      ]);

      const projectsList = await projectsRes.json();
      const p = projectsList.find(
        (proj: Project) => proj.id === projectId
      );
      if (p) setProject(p);

      const threadsList = await threadsRes.json();
      if (Array.isArray(threadsList)) setThreads(threadsList);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleNewChat() {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (res.ok) {
      const thread = await res.json();
      router.push(
        `/workspace/${workspaceId}/project/${projectId}/chat/${thread.id}`
      );
    }
  }

  async function handleReindex() {
    setReindexing(true);
    try {
      await fetch(
        `/api/workspaces/${workspaceId}/projects/${projectId}/reindex`,
        { method: "POST" }
      );
      // Refresh project data to see new indexing status
      setTimeout(fetchData, 1000);
    } finally {
      setReindexing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/workspace/${workspaceId}`}
        className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">
            {project?.githubRepoFullName || "Project"}
          </h1>
          {project && (
            <div className="mt-2 flex items-center gap-3">
              <IndexingProgress
                projectId={project.id}
                workspaceId={workspaceId}
                initialStatus={project.indexingStatus}
                initialProgress={project.indexingProgress}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReindex}
                disabled={reindexing}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1 ${reindexing ? "animate-spin" : ""}`}
                />
                {reindexing ? "Re-indexing..." : "Re-index"}
              </Button>
            </div>
          )}
        </div>
        <Button onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-1" /> New chat
        </Button>
      </div>

      {/* Status banners */}
      {project?.indexingStatus === "pending" && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2">
          <Clock className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">
            Indexing hasn&apos;t started yet. The codebase needs to be indexed
            before you can chat with it.
          </p>
        </div>
      )}
      {project?.indexingStatus === "indexing" && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
          <Spinner className="h-4 w-4 border-blue-400 border-t-blue-600 shrink-0" />
          <p className="text-sm text-blue-700">
            Indexing is in progress. You can start a chat, but results may be
            incomplete until indexing finishes.
          </p>
        </div>
      )}
      {project?.indexingStatus === "failed" && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--destructive)] shrink-0" />
          <p className="text-sm text-[var(--destructive)]">
            Indexing failed. Try re-indexing the codebase using the button above.
          </p>
        </div>
      )}

      {threads.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-lg">
          <MessageSquare className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
          <p className="text-[var(--muted-foreground)] mb-4">
            No conversations yet. Start chatting with your codebase!
          </p>
          <Button onClick={handleNewChat}>Start a chat</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/workspace/${workspaceId}/project/${projectId}/chat/${thread.id}`}
              className="flex items-center gap-3 p-4 border border-[var(--border)] rounded-lg hover:border-[var(--muted-foreground)] transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{thread.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(thread.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
