"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CreateWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to create workspace");
        return;
      }

      router.push("/technical-level");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2">Create a workspace</h1>
        <p className="text-[var(--muted-foreground)] mb-6">
          A workspace is where your team chats with your codebase.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="workspace-name"
            label="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Company"
            required
          />

          {error && (
            <p className="text-sm text-[var(--destructive)]">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create workspace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
