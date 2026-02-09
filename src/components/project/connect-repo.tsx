"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { Check } from "lucide-react";

interface Repo {
  id: number;
  full_name: string;
  default_branch: string;
  installationId: number;
}

interface ConnectedProject {
  githubRepoId: number;
}

interface ConnectRepoProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

export function ConnectRepo({
  workspaceId,
  open,
  onClose,
  onConnected,
}: ConnectRepoProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [connectedRepoIds, setConnectedRepoIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setFetchError(null);

    Promise.all([
      fetch("/api/github/repos").then((r) => {
        if (!r.ok) throw new Error(`Failed to load repos (${r.status})`);
        return r.json();
      }),
      fetch(`/api/workspaces/${workspaceId}/projects`).then((r) => {
        if (!r.ok) throw new Error(`Failed to load projects (${r.status})`);
        return r.json();
      }),
    ])
      .then(([repoData, projectData]) => {
        setRepos(Array.isArray(repoData) ? repoData : []);
        const ids = new Set<number>(
          Array.isArray(projectData)
            ? projectData.map((p: ConnectedProject) => p.githubRepoId)
            : []
        );
        setConnectedRepoIds(ids);
      })
      .catch((err) => {
        setRepos([]);
        setConnectedRepoIds(new Set());
        setFetchError(err.message || "Something went wrong");
      })
      .finally(() => setLoading(false));
  }, [open, workspaceId]);

  async function handleConnect(repo: Repo) {
    setConnecting(repo.id);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepoId: repo.id,
          githubRepoFullName: repo.full_name,
          githubInstallationId: repo.installationId,
          defaultBranch: repo.default_branch,
        }),
      });

      if (res.ok) {
        onConnected();
        onClose();
      }
    } finally {
      setConnecting(null);
    }
  }

  const githubAppUrl = `https://github.com/apps/${process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "jakoniko"}/installations/new`;

  return (
    <Modal open={open} onClose={onClose} title="Connect a repository">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : fetchError ? (
        <div className="text-center py-8">
          <p className="text-[var(--destructive)] mb-2">
            Could not load repositories.
          </p>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            {fetchError}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setLoading(true);
              setFetchError(null);
              fetch("/api/github/repos")
                .then((r) => {
                  if (!r.ok) throw new Error(`Failed to load repos (${r.status})`);
                  return r.json();
                })
                .then((data) => setRepos(Array.isArray(data) ? data : []))
                .catch((err) => setFetchError(err.message || "Something went wrong"))
                .finally(() => setLoading(false));
            }}
          >
            Retry
          </Button>
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[var(--muted-foreground)] mb-4">
            No GitHub repos available. Install the Jakoniko GitHub App first.
          </p>
          <Button
            onClick={() => window.open(githubAppUrl, "_blank")}
          >
            Install GitHub App
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {repos.map((repo) => {
            const isConnected = connectedRepoIds.has(repo.id);
            return (
              <div
                key={repo.id}
                className={`flex items-center justify-between p-3 border border-[var(--border)] rounded-lg ${
                  isConnected ? "opacity-60" : ""
                }`}
              >
                <span className="text-sm font-medium">{repo.full_name}</span>
                {isConnected ? (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleConnect(repo)}
                    disabled={connecting === repo.id}
                  >
                    {connecting === repo.id ? "Connecting..." : "Connect"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
