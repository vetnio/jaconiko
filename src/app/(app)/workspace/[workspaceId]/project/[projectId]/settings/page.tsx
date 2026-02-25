"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { Database, CheckCircle2, XCircle } from "lucide-react";

export default function ProjectSettingsPage() {
  const params = useParams();
  const toast = useToast();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionString, setConnectionString] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
  } | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/db-connection`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load connection status");
        return res.json();
      })
      .then((data) => setIsConnected(data.isConnected))
      .catch(() => toast.error("Failed to load database connection status."))
      .finally(() => setLoading(false));
  }, [projectId, toast]);

  async function handleTestConnection() {
    if (!connectionString.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/db-connection/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionString: connectionString.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setTestResult({ success: true });
      } else {
        setTestResult({ success: false, error: data.error || "Test failed" });
      }
    } catch {
      setTestResult({ success: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!connectionString.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/db-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString: connectionString.trim() }),
      });
      if (res.ok) {
        setIsConnected(true);
        setConnectionString("");
        setTestResult(null);
        toast.success("Database connection saved.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save connection.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/db-connection`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIsConnected(false);
        setConnectionString("");
        setTestResult(null);
        toast.success("Database connection removed.");
      } else {
        toast.error("Failed to remove connection.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setRemoving(false);
      setShowRemoveConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-8 w-56 mb-6" />
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Workspace", href: `/workspace/${workspaceId}` },
          {
            label: "Project",
            href: `/workspace/${workspaceId}/project/${projectId}`,
          },
          { label: "Settings" },
        ]}
      />
      <h1 className="text-xl font-bold mb-6">Project Settings</h1>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-5 w-5 text-[var(--muted-foreground)]" />
            <h2 className="text-lg font-semibold">Database Connection</h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Connect a PostgreSQL database to enable AI-powered SQL queries
            against your data.
          </p>

          {/* Connection status badge */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-sm font-medium">Status:</span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)] bg-[var(--success)]/10 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-full">
                <XCircle className="h-3.5 w-3.5" />
                Not connected
              </span>
            )}
          </div>

          {/* Connection string input + actions */}
          <form onSubmit={handleSave} className="space-y-3">
            <Input
              id="db-connection-string"
              type="password"
              label={
                isConnected
                  ? "Replace connection string"
                  : "PostgreSQL connection string"
              }
              placeholder="postgresql://user:password@host:5432/database"
              value={connectionString}
              onChange={(e) => {
                setConnectionString(e.target.value);
                setTestResult(null);
              }}
              autoComplete="off"
            />

            {/* Test result feedback */}
            {testResult && (
              <div
                className={`text-sm px-3 py-2 rounded-lg ${
                  testResult.success
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                }`}
              >
                {testResult.success
                  ? "Connection successful!"
                  : `Connection failed: ${testResult.error}`}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleTestConnection}
                loading={testing}
                disabled={!connectionString.trim()}
              >
                Test Connection
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={saving}
                disabled={!connectionString.trim()}
              >
                {isConnected ? "Update Connection" : "Save Connection"}
              </Button>
            </div>
          </form>

          {/* Remove connection (only shown when connected) */}
          {isConnected && (
            <div className="mt-6 pt-5 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--muted-foreground)] mb-3">
                Removing the connection will prevent the AI from querying your
                database.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowRemoveConfirm(true)}
              >
                Remove Connection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleRemove}
        title="Remove database connection"
        message="This will remove the stored connection string. The AI will no longer be able to query your database. You can add a new connection at any time."
        confirmLabel="Remove connection"
        destructive
        loading={removing}
      />
    </div>
  );
}
