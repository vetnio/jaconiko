"use client";

import ReactMarkdown from "react-markdown";
import { User, Sparkles } from "lucide-react";
import { ToolInvocation } from "./tool-invocation";
import { InlineDashboard } from "./inline-dashboard";

interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  state: "call" | "result" | "partial-call";
  args: Record<string, unknown>;
  result?: unknown;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  toolInvocations?: ToolInvocationData[];
}

export function MessageBubble({ role, content, toolInvocations }: MessageBubbleProps) {
  const isUser = role === "user";

  // Separate dashboard results from other tool invocations
  const dashboardResults = toolInvocations?.filter(
    (inv) =>
      inv.toolName === "createDashboard" &&
      inv.state === "result" &&
      inv.result &&
      typeof inv.result === "object" &&
      !("error" in inv.result)
  );

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-[var(--primary-foreground)]" />
        </div>
      )}
      <div className="max-w-[80%] min-w-0 space-y-3">
        {/* Message bubble */}
        <div
          className={`overflow-hidden rounded-lg px-4 py-3 ${
            isUser
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-[var(--muted)]"
          }`}
        >
          {!isUser && toolInvocations && toolInvocations.length > 0 && (
            <div className="mb-2 border-b border-[var(--border)] pb-2">
              {toolInvocations.map((invocation) => (
                <ToolInvocation
                  key={invocation.toolCallId}
                  toolName={invocation.toolName}
                  state={invocation.state}
                  args={invocation.args}
                />
              ))}
            </div>
          )}
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="text-sm prose prose-sm max-w-none dark:prose-invert overflow-x-auto break-words [word-break:break-word] [&_code]:break-all [&_pre]:overflow-x-auto">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Inline dashboards rendered outside the bubble for proper sizing */}
        {dashboardResults && dashboardResults.length > 0 &&
          dashboardResults.map((inv) => (
            <InlineDashboard
              key={inv.toolCallId}
              result={inv.result as Record<string, unknown>}
            />
          ))}
      </div>
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
          <User className="h-4 w-4 text-[var(--muted-foreground)]" />
        </div>
      )}
    </div>
  );
}
