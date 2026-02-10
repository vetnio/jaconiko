"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { MemberList } from "@/components/workspace/member-list";
import { InviteForm } from "@/components/workspace/invite-form";
import { PendingInvitations } from "@/components/workspace/pending-invitations";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RefreshCw } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  role: string;
  userName: string;
  userEmail: string;
}

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const workspaceId = params.workspaceId as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [wsName, setWsName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);

  const fetchMembers = useCallback(() => {
    setError(null);
    fetch(`/api/workspaces/${workspaceId}/members`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load members");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setMembers(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
    // Fetch workspace info
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((list: Workspace[]) => {
        const ws = list.find((w) => w.id === workspaceId);
        if (ws) {
          setWorkspace(ws);
          setWsName(ws.name);
        }
      })
      .catch(() => {});
  }, [fetchMembers, workspaceId]);

  const currentMember = members.find((m) => m.userId === session?.user?.id);
  const currentRole = currentMember?.role || "user";
  const isAdmin = currentRole === "admin" || currentRole === "superadmin";
  const isSuperadmin = currentRole === "superadmin";

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!wsName.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wsName.trim() }),
      });
      if (res.ok && workspace) {
        setWorkspace({ ...workspace, name: wsName.trim() });
      }
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-[var(--destructive)] mb-4">{error}</p>
        <Button size="sm" onClick={fetchMembers}>
          <RefreshCw className="h-4 w-4 mr-1" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Workspace Settings</h1>

      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Workspace name</h2>
          <form onSubmit={handleRename} className="flex gap-2">
            <Input
              id="workspace-name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              placeholder="Workspace name"
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={renaming || wsName.trim() === workspace?.name}
            >
              {renaming ? "Saving..." : "Rename"}
            </Button>
          </form>
        </section>
      )}

      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Invite a member</h2>
          <InviteForm
            workspaceId={workspaceId}
            onInvited={() => {
              fetchMembers();
              setInviteCount((c) => c + 1);
            }}
          />
        </section>
      )}

      {isAdmin && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pending invitations</h2>
          <PendingInvitations
            workspaceId={workspaceId}
            refreshKey={inviteCount}
          />
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Members</h2>
        <MemberList
          members={members}
          workspaceId={workspaceId}
          currentUserRole={currentRole}
          currentUserId={session?.user?.id || ""}
          onUpdate={fetchMembers}
        />
      </section>

      {isSuperadmin && (
        <section className="border-t border-[var(--border)] pt-6">
          <h2 className="text-lg font-semibold mb-2 text-[var(--destructive)]">
            Danger zone
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Deleting a workspace will permanently remove all projects, chats,
            and members.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete workspace
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete workspace"
        message="This will permanently delete the workspace and all its projects, chats, and members. This action cannot be undone."
        confirmLabel="Delete workspace"
        destructive
        loading={deleting}
      />
    </div>
  );
}
