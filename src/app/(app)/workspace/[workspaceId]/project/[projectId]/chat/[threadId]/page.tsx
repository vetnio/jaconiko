"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { ThreadList } from "@/components/chat/thread-list";
import { Spinner } from "@/components/ui/spinner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;
  const threadId = params.threadId as string;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const threadsRef = useRef<Thread[]>([]);

  const fetchThreads = useCallback(async (): Promise<Thread[]> => {
    try {
      const res = await fetch(`/api/threads?projectId=${projectId}`);
      if (!res.ok) return threadsRef.current;
      const data = await res.json();
      if (Array.isArray(data)) {
        setThreads(data);
        threadsRef.current = data;
        return data;
      }
    } catch {
      // Keep existing threads on error
    }
    return threadsRef.current;
  }, [projectId]);

  useEffect(() => {
    async function load() {
      try {
        const [, messagesRes] = await Promise.all([
          fetchThreads(),
          fetch(`/api/threads/${threadId}/messages`),
        ]);

        if (messagesRes.ok) {
          const messagesData = await messagesRes.json();
          if (Array.isArray(messagesData)) {
            setMessages(messagesData);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [threadId, projectId, fetchThreads]);

  async function handleNewThread() {
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (res.ok) {
        const thread = await res.json();
        router.push(
          `/workspace/${workspaceId}/project/${projectId}/chat/${thread.id}`
        );
      }
    } catch {
      // Silently fail — user can retry
    }
  }

  async function handleRename(tid: string, title: string) {
    try {
      const res = await fetch("/api/threads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: tid, title }),
      });
      if (res.ok) {
        fetchThreads();
      }
    } catch {
      // Silently fail — user can retry
    }
  }

  async function handleDelete(tid: string) {
    try {
      const res = await fetch("/api/threads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: tid }),
      });

      if (!res.ok) return;

      const updatedThreads = await fetchThreads();

      if (tid === threadId) {
        const remaining = updatedThreads.filter((t) => t.id !== tid);
        if (remaining.length > 0) {
          router.push(
            `/workspace/${workspaceId}/project/${projectId}/chat/${remaining[0].id}`
          );
        } else {
          router.push(`/workspace/${workspaceId}/project/${projectId}`);
        }
      }
    } catch {
      // Silently fail — user can retry
    }
  }

  async function handleFirstMessage(message: string) {
    // Auto-generate title
    fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, firstMessage: message }),
    })
      .then(() => fetchThreads())
      .catch(() => {
        // Title generation is best-effort
      });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ThreadList
        threads={threads}
        workspaceId={workspaceId}
        projectId={projectId}
        onNewThread={handleNewThread}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <div className="flex-1">
        <ChatInterface
          threadId={threadId}
          initialMessages={messages}
          onFirstMessage={handleFirstMessage}
        />
      </div>
    </div>
  );
}
