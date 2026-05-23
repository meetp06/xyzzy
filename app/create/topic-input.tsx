"use client";

import { useCallback, useState, useTransition } from "react";

import { suggestTopicAction } from "./actions";
import { TOPIC_TYPES } from "./constants";

interface TopicInputProps {
  topic: string;
  topicType: string;
  context: string;
  templateName?: string;
  onTopicChange: (value: string) => void;
  onTopicTypeChange: (value: string) => void;
  onContextChange: (value: string) => void;
}

type Mode = "ai" | "user";

function detectTopicType(value: string): string {
  if (value.includes("news.ycombinator.com")) return TOPIC_TYPES.hacker_news;
  if (value.trimStart().startsWith("http")) return TOPIC_TYPES.news_link;
  return TOPIC_TYPES.freetext;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case TOPIC_TYPES.hacker_news: return "Hacker News Link";
    case TOPIC_TYPES.news_link: return "News Link";
    default: return "Free Text";
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case TOPIC_TYPES.hacker_news: return "#ff6600";
    case TOPIC_TYPES.news_link: return "#1c65be";
    default: return "rgba(255,255,255,0.6)";
  }
}

export function TopicInput({
  topic,
  topicType,
  context,
  templateName,
  onTopicChange,
  onTopicTypeChange,
  onContextChange,
}: TopicInputProps) {
  const [mode, setMode] = useState<Mode>("user");
  const [isPending, startTransition] = useTransition();
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const handleTopicChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onTopicChange(value);
      const detected = detectTopicType(value);
      if (detected !== topicType) onTopicTypeChange(detected);
    },
    [topicType, onTopicChange, onTopicTypeChange],
  );

  const requestSuggestion = () => {
    setSuggestError(null);
    startTransition(async () => {
      const res = await suggestTopicAction(templateName);
      if (res.error) {
        setSuggestError(res.error);
      } else if (res.topic) {
        onTopicChange(res.topic);
        onTopicTypeChange(detectTopicType(res.topic));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("ai")}
          className={`tone-btn ${mode === "ai" ? "active" : ""}`}
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          ✦ AI-generated
        </button>
        <button
          type="button"
          onClick={() => setMode("user")}
          className={`tone-btn ${mode === "user" ? "active" : ""}`}
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          ✎ I'll write it
        </button>
      </div>

      {mode === "ai" && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={requestSuggestion}
            disabled={isPending}
            className="btn-action w-full"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {isPending ? "Thinking..." : topic ? "↻ Suggest another" : "Suggest a topic for me"}
          </button>

          {topic && (
            <div
              className="rounded-[14px] border border-[var(--border)] bg-white/[0.04] p-4 text-base leading-relaxed text-white"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              <span className="italic">{topic}</span>
            </div>
          )}

          {suggestError && (
            <p className="text-xs text-red-400" style={{ fontFamily: "var(--font-space-mono)" }}>
              {suggestError}
            </p>
          )}
        </div>
      )}

      {mode === "user" && (
        <div className="space-y-3">
          <textarea
            value={topic}
            onChange={handleTopicChange}
            placeholder="What should the show be about? Paste a link or describe a topic..."
            rows={4}
            className="w-full resize-none rounded-[14px] border border-[var(--border)] bg-white/[0.03] p-4 text-base leading-relaxed text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ fontFamily: "var(--font-body)" }}
          />

          <textarea
            value={context}
            onChange={e => onContextChange(e.target.value)}
            placeholder="Extra context (optional) — angle, tone, audience, anything specific you want covered…"
            rows={3}
            className="w-full resize-none rounded-[14px] border border-[var(--border)] bg-white/[0.03] p-4 text-sm leading-relaxed text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ fontFamily: "var(--font-body)" }}
          />
        </div>
      )}

      {/* Detected type indicator (both modes) */}
      {topic.trim().length > 0 && (
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full border border-[var(--border)]"
            style={{ backgroundColor: getTypeColor(topicType) }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            Detected: {getTypeLabel(topicType)}
          </span>
        </div>
      )}
    </div>
  );
}
