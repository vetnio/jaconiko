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
  const initialThreadId = params.threadId as string;

  const [activeThreadId, setActiveThreadId] = useState(initialThreadId);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messagesForActive, setMessagesForActive] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const threadsRef = useRef<Thread[]>([]);
  const messageCache = useRef<Map<string, ChatMessage[]>>(new Map());
  const initializedRef = useRef(false);

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

  const fetchMessages = useCallback(
    async (tid: string): Promise<ChatMessage[]> => {
      try {
        const res = await fetch(`/api/threads/${tid}/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            messageCache.current.set(tid, data);
            return data;
          }
        }
      } catch {
        // Fall through
      }
      return [];
    },
    []
  );

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        const [, msgs] = await Promise.all([
          fetchThreads(),
          fetchMessages(initialThreadId),
        ]);
        setMessagesForActive(msgs);
      } finally {
        initializedRef.current = true;
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages when activeThreadId changes (after initial load)
  useEffect(() => {
    if (!initializedRef.current) return;

    const cached = messageCache.current.get(activeThreadId);
    if (cached) {
      setMessagesForActive(cached);
    } else {
      fetchMessages(activeThreadId).then((msgs) => {
        setMessagesForActive(msgs);
      });
    }
  }, [activeThreadId, fetchMessages]);

  const handleSelectThread = useCallback(
    (tid: string) => {
      if (tid === activeThreadId) return;
      setActiveThreadId(tid);
      const newUrl = `/workspace/${workspaceId}/project/${projectId}/chat/${tid}`;
      window.history.pushState(null, "", newUrl);
    },
    [activeThreadId, workspaceId, projectId]
  );

  // Browser back/forward support
  useEffect(() => {
    function handlePopState() {
      const match = window.location.pathname.match(/\/chat\/([^/]+)/);
      if (match?.[1]) {
        setActiveThreadId(match[1]);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  async function handleNewThread() {
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (res.ok) {
        const thread = await res.json();
        messageCache.current.set(thread.id, []);
        await fetchThreads();
        handleSelectThread(thread.id);
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

      messageCache.current.delete(tid);
      const updatedThreads = await fetchThreads();

      if (tid === activeThreadId) {
        const remaining = updatedThreads.filter((t) => t.id !== tid);
        if (remaining.length > 0) {
          handleSelectThread(remaining[0].id);
        } else {
          router.push(`/workspace/${workspaceId}/project/${projectId}`);
        }
      }
    } catch {
      // Silently fail — user can retry
    }
  }

  async function handleFirstMessage(message: string) {
    fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: activeThreadId, firstMessage: message }),
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
        activeThreadId={activeThreadId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <div className="flex-1">
        <ChatInterface
          key={activeThreadId}
          threadId={activeThreadId}
          initialMessages={messagesForActive}
          onFirstMessage={handleFirstMessage}
        />
      </div>
    </div>
  );
}
