"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const projectId = params.projectId as string;

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function redirectToChat() {
      try {
        // Fetch existing threads
        const threadsRes = await fetch(`/api/threads?projectId=${projectId}`);
        const threads = await threadsRes.json();

        if (Array.isArray(threads) && threads.length > 0) {
          // Redirect to most recent thread
          router.replace(
            `/workspace/${workspaceId}/project/${projectId}/chat/${threads[0].id}`
          );
          return;
        }

        // No threads — create one
        const res = await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });

        if (res.ok) {
          const thread = await res.json();
          router.replace(
            `/workspace/${workspaceId}/project/${projectId}/chat/${thread.id}`
          );
        } else {
          setError("Failed to create chat");
        }
      } catch {
        setError("Something went wrong");
      }
    }

    redirectToChat();
  }, [workspaceId, projectId, router]);

  if (error) {
    return (
      <div className="flex justify-center py-20 text-sm text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex justify-center py-20">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
