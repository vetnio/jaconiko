"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { ChevronDown, Plus, Loader2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const params = useParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const currentId = params.workspaceId as string;

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then(setWorkspaces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const current = workspaces.find((w) => w.id === currentId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--muted-foreground)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <Dropdown
      trigger={
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-sm font-medium">
          {current?.name || "Select workspace"}
          <ChevronDown className="h-4 w-4 text-[var(--muted-foreground)]" />
        </button>
      }
    >
      {workspaces.map((w) => (
        <DropdownItem
          key={w.id}
          onClick={() => router.push(`/workspace/${w.id}`)}
        >
          {w.name}
        </DropdownItem>
      ))}
      <div className="border-t border-[var(--border)] mt-1 pt-1">
        <DropdownItem onClick={() => router.push("/create-workspace")}>
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New workspace
          </span>
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
