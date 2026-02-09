"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MoreVertical } from "lucide-react";

interface Member {
  id: string;
  userId: string;
  role: string;
  userName: string;
  userEmail: string;
}

interface MemberListProps {
  members: Member[];
  workspaceId: string;
  currentUserRole: string;
  currentUserId: string;
  onUpdate: () => void;
}

export function MemberList({
  members,
  workspaceId,
  currentUserRole,
  currentUserId,
  onUpdate,
}: MemberListProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const isAdmin = currentUserRole === "admin" || currentUserRole === "superadmin";

  async function handleRoleChange(memberId: string, role: string) {
    setLoading(memberId);
    try {
      await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, role }),
      });
      onUpdate();
    } finally {
      setLoading(null);
    }
  }

  async function handleRemoveConfirm() {
    if (!removeTarget) return;
    setLoading(removeTarget.id);
    try {
      await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: removeTarget.id }),
      });
      onUpdate();
    } finally {
      setLoading(null);
      setRemoveTarget(null);
    }
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg"
        >
          <div>
            <p className="font-medium text-sm">{member.userName}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {member.userEmail}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
              {member.role}
            </span>
            {isAdmin &&
              member.userId !== currentUserId &&
              member.role !== "superadmin" && (
                <Dropdown
                  align="right"
                  trigger={
                    <Button variant="ghost" size="sm" disabled={loading === member.id}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  }
                >
                  {member.role === "user" && (
                    <DropdownItem
                      onClick={() => handleRoleChange(member.id, "admin")}
                    >
                      Make admin
                    </DropdownItem>
                  )}
                  {member.role === "admin" && (
                    <DropdownItem
                      onClick={() => handleRoleChange(member.id, "user")}
                    >
                      Remove admin
                    </DropdownItem>
                  )}
                  <DropdownItem
                    destructive
                    onClick={() => setRemoveTarget(member)}
                  >
                    Remove from workspace
                  </DropdownItem>
                </Dropdown>
              )}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
        title="Remove member"
        message={`Are you sure you want to remove ${removeTarget?.userName || "this member"} from the workspace?`}
        confirmLabel="Remove"
        destructive
        loading={loading !== null}
      />
    </div>
  );
}
