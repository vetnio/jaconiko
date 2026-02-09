"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InviteFormProps {
  workspaceId: string;
  onInvited: () => void;
}

export function InviteForm({ workspaceId, onInvited }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send invitation");
        return;
      }

      setSuccess(true);
      setEmail("");
      onInvited();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            required
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "user" | "admin")}
          className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm"
        >
          <option value="user">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Invite"}
        </Button>
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      {success && (
        <p className="text-sm text-green-600">Invitation sent!</p>
      )}
    </form>
  );
}
