"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { X } from "lucide-react";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  invitedByName: string;
}

interface PendingInvitationsProps {
  workspaceId: string;
  refreshKey?: number;
}

export function PendingInvitations({
  workspaceId,
  refreshKey,
}: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [cancelTarget, setCancelTarget] = useState<Invitation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/invitations`
      );
      if (!res.ok) return;
      const data: Invitation[] = await res.json();
      setInvitations(data.filter((inv) => inv.status === "pending"));
    } catch {
      // silently fail — the section just won't show
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations, refreshKey]);

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: cancelTarget.id }),
      });
      setInvitations((prev) =>
        prev.filter((inv) => inv.id !== cancelTarget.id)
      );
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  }

  if (invitations.length === 0) return null;

  return (
    <div className="space-y-2">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
        >
          <div>
            <p className="font-medium text-sm">{inv.email}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Invited by {inv.invitedByName} &middot;{" "}
              {new Date(inv.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
              {inv.role}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelTarget(inv)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel invitation"
        message={`Are you sure you want to cancel the invitation to ${cancelTarget?.email || "this person"}?`}
        confirmLabel="Cancel invitation"
        destructive
        loading={cancelling}
      />
    </div>
  );
}
