"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { getChatMessagesAction, sendChatMessageAction } from "./actions";

import type { ChatMessage } from "@/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  showId: string;
  topic: string;
  transcript: string;
  researchContext: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ChatPanel({ showId, topic, transcript, researchContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing messages on mount
  useEffect(() => {
    getChatMessagesAction(showId).then(setMessages);
  }, [showId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || isPending) return;

    setInput("");
    setError(null);

    // Optimistic update — add user message immediately
    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      showId,
      role: "user",
      content: msg,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    startTransition(async () => {
      const result = await sendChatMessageAction(showId, msg, {
        topic,
        transcript,
        researchContext,
      });

      if (result.error) {
        setError(result.error);
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== optimisticUserMsg.id));
        setInput(msg); // Restore input
      } else {
        // Refresh full message list to get real IDs
        const updated = await getChatMessagesAction(showId);
        setMessages(updated);
      }

      inputRef.current?.focus();
    });
  }, [input, isPending, showId, topic, transcript, researchContext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card-flat flex flex-col overflow-hidden" style={{ maxHeight: "400px" }}>
      {/* Header */}
      <div
        className="panel-brutal-header bg-background-dark text-white"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        Chat with Content
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !isPending && (
          <p className="py-6 text-center text-sm text-foreground-muted">
            Ask a question about the show content
          </p>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] border-2 border-border px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-foreground text-surface"
                  : "bg-surface-elevated text-foreground"
              }`}
            >
              {msg.role === "assistant" && (
                <span
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  AI
                </span>
              )}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isPending && (
          <div className="flex justify-start">
            <div className="border-2 border-border bg-surface-elevated px-3 py-2">
              <span
                className="text-xs text-foreground-muted"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                Thinking...
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="border-2 border-red-600 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex border-t-3 border-border">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the show..."
          disabled={isPending}
          className="flex-1 bg-surface px-4 py-3 text-sm placeholder:text-foreground-muted focus:outline-none disabled:opacity-50"
          style={{ fontFamily: "var(--font-space-mono)" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isPending || !input.trim()}
          className="border-l-3 border-border bg-accent px-5 py-3 text-sm font-bold transition-colors hover:brightness-110 disabled:opacity-50"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          {isPending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
