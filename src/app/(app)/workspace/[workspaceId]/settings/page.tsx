"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { MemberList } from "@/components/workspace/member-list";
import { InviteForm } from "@/components/workspace/invite-form";
import { PendingInvitations } from "@/components/workspace/pending-invitations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
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
  const toast = useToast();
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
        toast.success("Workspace renamed!");
      } else {
        toast.error("Failed to rename workspace.");
      }
    } catch {
      toast.error("Network error. Please try again.");
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
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
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
      <Breadcrumbs
        items={[
          { label: "Workspace", href: `/workspace/${workspaceId}` },
          { label: "Settings" },
        ]}
      />
      <h1 className="text-xl font-bold mb-6">Workspace Settings</h1>

      {isAdmin && (
        <Card className="mb-6">
          <CardContent className="pt-6">
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
                loading={renaming}
                disabled={wsName.trim() === workspace?.name}
              >
                Rename
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3">Invite a member</h2>
            <InviteForm
              workspaceId={workspaceId}
              onInvited={() => {
                fetchMembers();
                setInviteCount((c) => c + 1);
              }}
            />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3">Pending invitations</h2>
            <PendingInvitations
              workspaceId={workspaceId}
              refreshKey={inviteCount}
            />
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-3">Members</h2>
          <MemberList
            members={members}
            workspaceId={workspaceId}
            currentUserRole={currentRole}
            currentUserId={session?.user?.id || ""}
            onUpdate={fetchMembers}
          />
        </CardContent>
      </Card>

      {isSuperadmin && (
        <Card className="border-[var(--destructive)]/30">
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
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
