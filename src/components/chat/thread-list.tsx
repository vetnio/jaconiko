"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MessageSquare, Plus, Pencil, Trash2, Check, X } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

interface ThreadListProps {
  threads: Thread[];
  workspaceId: string;
  projectId: string;
  onNewThread: () => void;
  onRename: (threadId: string, title: string) => void;
  onDelete: (threadId: string) => void;
}

export function ThreadList({
  threads,
  workspaceId,
  projectId,
  onNewThread,
  onRename,
  onDelete,
}: ThreadListProps) {
  const params = useParams();
  const currentThreadId = params.threadId as string;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function startEdit(thread: Thread) {
    setEditingId(thread.id);
    setEditTitle(thread.title);
  }

  function confirmEdit(threadId: string) {
    onRename(threadId, editTitle);
    setEditingId(null);
  }

  function handleDeleteConfirm() {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="w-64 border-r border-[var(--border)] h-full flex flex-col">
      <div className="p-3 border-b border-[var(--border)]">
        <Button size="sm" className="w-full" onClick={onNewThread}>
          <Plus className="h-4 w-4 mr-1" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className={`group flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] ${
              thread.id === currentThreadId
                ? "bg-[var(--muted)]"
                : "hover:bg-[var(--muted)]/50"
            }`}
          >
            {editingId === thread.id ? (
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 min-w-0 text-sm px-1 py-0.5 rounded border border-[var(--border)] bg-[var(--background)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit(thread.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button onClick={() => confirmEdit(thread.id)} className="cursor-pointer">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </button>
                <button onClick={() => setEditingId(null)} className="cursor-pointer">
                  <X className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  href={`/workspace/${workspaceId}/project/${projectId}/chat/${thread.id}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                  <span className="text-sm truncate">{thread.title}</span>
                </Link>
                <div className="hidden group-hover:flex items-center gap-0.5">
                  <button
                    onClick={() => startEdit(thread)}
                    className="p-0.5 rounded hover:bg-[var(--border)] cursor-pointer"
                  >
                    <Pencil className="h-3 w-3 text-[var(--muted-foreground)]" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(thread.id)}
                    className="p-0.5 rounded hover:bg-[var(--border)] cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3 text-[var(--destructive)]" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete chat"
        message="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
