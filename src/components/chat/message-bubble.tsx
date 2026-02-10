"use client";

import ReactMarkdown from "react-markdown";
import { User, Bot } from "lucide-react";
import { ToolInvocation } from "./tool-invocation";

interface ToolInvocationData {
  toolCallId: string;
  toolName: string;
  state: "call" | "result" | "partial-call";
  args: Record<string, unknown>;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  toolInvocations?: ToolInvocationData[];
}

export function MessageBubble({ role, content, toolInvocations }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : ""}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center">
          <Bot className="h-4 w-4 text-[var(--primary-foreground)]" />
        </div>
      )}
      <div
        className={`max-w-[80%] min-w-0 overflow-hidden rounded-lg px-4 py-3 ${
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
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
          <User className="h-4 w-4 text-[var(--muted-foreground)]" />
        </div>
      )}
    </div>
  );
}
