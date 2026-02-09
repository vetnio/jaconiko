"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Invitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  invitedByName: string;
  role: string;
}

export default function InvitationsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push("/login");
      return;
    }

    async function fetchInvitations() {
      try {
        const res = await fetch("/api/invitations");
        if (res.ok) {
          const data = await res.json();
          setInvitations(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchInvitations();
  }, [session, isPending, router]);

  async function handleAccept(invitationId: string) {
    const res = await fetch(`/api/invitations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId, action: "accept" }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/workspace/${data.workspaceId}`);
    }
  }

  async function handleDeclineConfirm() {
    if (!declineTarget) return;
    await fetch(`/api/invitations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationId: declineTarget, action: "decline" }),
    });
    setInvitations((prev) => prev.filter((i) => i.id !== declineTarget));
    setDeclineTarget(null);
  }

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-2">Pending Invitations</h1>
        <p className="text-[var(--muted-foreground)] mb-6">
          You&apos;ve been invited to join the following workspaces.
        </p>

        {invitations.length === 0 ? (
          <div className="text-center py-8 border border-[var(--border)] rounded-lg">
            <p className="text-[var(--muted-foreground)] mb-4">
              No pending invitations
            </p>
            <Button onClick={() => router.push("/create-workspace")}>
              Create a workspace
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg"
              >
                <div>
                  <p className="font-medium">{inv.workspaceName}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Invited by {inv.invitedByName} as {inv.role}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleAccept(inv.id)}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeclineTarget(inv.id)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            ))}
            <div className="text-center pt-4">
              <Button
                variant="secondary"
                onClick={() => router.push("/create-workspace")}
              >
                Or create a new workspace
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={declineTarget !== null}
        onClose={() => setDeclineTarget(null)}
        onConfirm={handleDeclineConfirm}
        title="Decline invitation"
        message="Are you sure you want to decline this workspace invitation?"
        confirmLabel="Decline"
        destructive
      />
    </div>
  );
}
