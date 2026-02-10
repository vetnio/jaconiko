"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "ai/react";
import { MessageBubble } from "./message-bubble";
import { Button } from "@/components/ui/button";
import { ArrowUp, AlertCircle, MessageSquare } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  threadId: string;
  initialMessages: ChatMessage[];
  onFirstMessage?: (message: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

export function ChatInterface({
  threadId,
  initialMessages,
  onFirstMessage,
  onLoadingChange,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [titleGenerated, setTitleGenerated] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: { threadId },
      initialMessages: initialMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
      })),
      maxSteps: 15,
      onError: (error) => {
        setChatError(error.message || "Failed to send message. Please try again.");
      },
    });

  // Report loading state changes
  useEffect(() => {
    onLoadingChangeRef.current?.(isLoading);
  }, [isLoading]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate title after first user message
  useEffect(() => {
    if (
      !titleGenerated &&
      messages.length >= 1 &&
      messages[0].role === "user" &&
      onFirstMessage
    ) {
      setTitleGenerated(true);
      onFirstMessage(messages[0].content);
    }
  }, [messages, titleGenerated, onFirstMessage]);

  // Clear error when user starts typing
  useEffect(() => {
    if (input && chatError) setChatError(null);
  }, [input, chatError]);

  // Detect if the AI is in a tool-use loop (last message has pending tool invocations)
  const lastMessage = messages[messages.length - 1];
  const isTooling =
    isLoading &&
    lastMessage?.role === "assistant" &&
    lastMessage.toolInvocations &&
    lastMessage.toolInvocations.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Error banner */}
      {chatError && (
        <div className="mx-4 mt-2 px-4 py-2 rounded-lg bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--destructive)] shrink-0" />
          <p className="text-sm text-[var(--destructive)] flex-1">{chatError}</p>
          <button
            onClick={() => setChatError(null)}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-6 w-6 text-[var(--accent-foreground)]" />
            </div>
            <p className="text-lg font-medium mb-2">
              Ask anything about your codebase
            </p>
            <p className="text-[var(--muted-foreground)] text-sm">
              Try questions like &quot;What does this app do?&quot; or
              &quot;How does the auth system work?&quot;
            </p>
          </div>
        )}
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role as "user" | "assistant"}
            content={message.content}
            toolInvocations={
              message.toolInvocations as
                | {
                    toolCallId: string;
                    toolName: string;
                    state: "call" | "result" | "partial-call";
                    args: Record<string, unknown>;
                  }[]
                | undefined
            }
          />
        ))}
        {isLoading && !isTooling && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
              <Spinner className="h-4 w-4 border-white/30 border-t-white" />
            </div>
            <div className="bg-[var(--muted)] rounded-lg px-4 py-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Thinking...
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your codebase..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="shrink-0 rounded-full !p-2.5">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
