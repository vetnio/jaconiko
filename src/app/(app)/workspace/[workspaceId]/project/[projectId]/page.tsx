"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MessageSquare, Plus, ArrowLeft, CheckCircle2 } from "lucide-react";
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
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

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
          <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Connected
          </p>
        </div>
        <Button onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-1" /> New chat
        </Button>
      </div>

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
