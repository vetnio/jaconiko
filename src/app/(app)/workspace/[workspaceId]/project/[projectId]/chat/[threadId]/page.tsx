"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  const [loading, setLoading] = useState(true);
  const [activeReady, setActiveReady] = useState(false);
  const [loadingThreadIds, setLoadingThreadIds] = useState<Set<string>>(
    new Set()
  );
  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(`unread-threads:${projectId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const threadsRef = useRef<Thread[]>([]);
  const messageCache = useRef<Map<string, ChatMessage[]>>(new Map());
  const initializedRef = useRef(false);
  const activeThreadIdRef = useRef(activeThreadId);
  const loadingThreadIdsRef = useRef(loadingThreadIds);

  // Keep refs in sync
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);
  useEffect(() => {
    loadingThreadIdsRef.current = loadingThreadIds;
  }, [loadingThreadIds]);

  // Persist unreadThreadIds to localStorage
  useEffect(() => {
    localStorage.setItem(
      `unread-threads:${projectId}`,
      JSON.stringify([...unreadThreadIds])
    );
  }, [unreadThreadIds, projectId]);

  // Compute which ChatInterfaces should be mounted
  const mountedThreadIds = useMemo(() => {
    const set = new Set(loadingThreadIds);
    if (activeReady) {
      set.add(activeThreadId);
    }
    return set;
  }, [loadingThreadIds, activeReady, activeThreadId]);

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
        await Promise.all([
          fetchThreads(),
          fetchMessages(initialThreadId),
        ]);
        setActiveReady(true);
      } finally {
        initializedRef.current = true;
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch messages when activeReady is false (cache miss / thread switch)
  useEffect(() => {
    if (!initializedRef.current) return;
    if (activeReady) return;

    // Thread is already mounted with live streaming data
    if (loadingThreadIdsRef.current.has(activeThreadId)) {
      setActiveReady(true);
      return;
    }

    // Check cache
    if (messageCache.current.has(activeThreadId)) {
      setActiveReady(true);
      return;
    }

    // Fetch from server
    fetchMessages(activeThreadId).then(() => {
      if (activeThreadIdRef.current === activeThreadId) {
        setActiveReady(true);
      }
    });
  }, [activeThreadId, activeReady, fetchMessages]);

  const handleLoadingChange = useCallback(
    (tid: string, isLoadingNow: boolean) => {
      if (isLoadingNow) {
        setLoadingThreadIds((prev) => {
          if (prev.has(tid)) return prev;
          const next = new Set(prev);
          next.add(tid);
          return next;
        });
      } else {
        let wasLoading = false;
        setLoadingThreadIds((prev) => {
          if (!prev.has(tid)) return prev;
          wasLoading = true;
          const next = new Set(prev);
          next.delete(tid);
          return next;
        });
        // Thread finished while user was on a different thread → mark unread
        // Guard: only if it was actually streaming (wasLoading), not just a
        // ChatInterface mount firing onLoadingChange(false) on init
        if (wasLoading && tid !== activeThreadIdRef.current) {
          messageCache.current.delete(tid);
          setUnreadThreadIds((prev) => {
            const next = new Set(prev);
            next.add(tid);
            return next;
          });
        }
      }
    },
    []
  );

  const handleSelectThread = useCallback(
    (tid: string) => {
      if (tid === activeThreadIdRef.current) return;
      setActiveThreadId(tid);
      const newUrl = `/workspace/${workspaceId}/project/${projectId}/chat/${tid}`;
      window.history.pushState(null, "", newUrl);

      // Clear unread for selected thread
      setUnreadThreadIds((prev) => {
        if (!prev.has(tid)) return prev;
        const next = new Set(prev);
        next.delete(tid);
        return next;
      });

      // Determine if thread is immediately ready
      if (
        loadingThreadIdsRef.current.has(tid) ||
        messageCache.current.has(tid)
      ) {
        setActiveReady(true);
      } else {
        setActiveReady(false);
      }
    },
    [workspaceId, projectId]
  );

  // Browser back/forward support
  useEffect(() => {
    function handlePopState() {
      const match = window.location.pathname.match(/\/chat\/([^/]+)/);
      if (match?.[1] && match[1] !== activeThreadIdRef.current) {
        const tid = match[1];
        setActiveThreadId(tid);
        setUnreadThreadIds((prev) => {
          if (!prev.has(tid)) return prev;
          const next = new Set(prev);
          next.delete(tid);
          return next;
        });
        // Let the activeReady effect handle fetching
        setActiveReady(false);
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
      setLoadingThreadIds((prev) => {
        if (!prev.has(tid)) return prev;
        const next = new Set(prev);
        next.delete(tid);
        return next;
      });
      setUnreadThreadIds((prev) => {
        if (!prev.has(tid)) return prev;
        const next = new Set(prev);
        next.delete(tid);
        return next;
      });

      const updatedThreads = await fetchThreads();

      if (tid === activeThreadIdRef.current) {
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

  async function handleFirstMessage(tid: string, message: string) {
    fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: tid, firstMessage: message }),
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
    <div className="flex h-full">
      <ThreadList
        threads={threads}
        activeThreadId={activeThreadId}
        loadingThreadIds={loadingThreadIds}
        unreadThreadIds={unreadThreadIds}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <div className="flex-1 relative">
        {!mountedThreadIds.has(activeThreadId) && (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        )}
        {Array.from(mountedThreadIds).map((tid) => (
          <div
            key={tid}
            className={tid === activeThreadId ? "h-full" : "hidden"}
          >
            <ChatInterface
              threadId={tid}
              initialMessages={messageCache.current.get(tid) || []}
              onFirstMessage={(msg) => handleFirstMessage(tid, msg)}
              onLoadingChange={(isLoading) => handleLoadingChange(tid, isLoading)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
