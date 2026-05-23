"use client";

import { useCallback, useState, useTransition } from "react";

import { suggestTopicAction } from "./actions";
import { TOPIC_TYPES } from "./constants";

interface TopicInputProps {
  // AI mode
  topic: string;
  topicType: string;
  context: string;
  // User-script mode
  userScript: string;
  scriptMode: "ai" | "user";
  templateName?: string;
  durationSeconds: number;
  onTopicChange: (value: string) => void;
  onTopicTypeChange: (value: string) => void;
  onContextChange: (value: string) => void;
  onUserScriptChange: (value: string) => void;
  onScriptModeChange: (mode: "ai" | "user") => void;
}

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
  userScript,
  scriptMode,
  templateName,
  durationSeconds,
  onTopicChange,
  onTopicTypeChange,
  onContextChange,
  onUserScriptChange,
  onScriptModeChange,
}: TopicInputProps) {
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

  const targetWords = Math.round((durationSeconds / 8) * 22); // ~22 words per 8s clip
  const wordCount = userScript.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onScriptModeChange("ai")}
          className={`tone-btn ${scriptMode === "ai" ? "active" : ""}`}
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          ✦ AI writes script
        </button>
        <button
          type="button"
          onClick={() => onScriptModeChange("user")}
          className={`tone-btn ${scriptMode === "user" ? "active" : ""}`}
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          ✎ I'll write the script
        </button>
      </div>

      {scriptMode === "ai" && (
        <div className="space-y-3">
          <p className="text-xs text-white/55" style={{ fontFamily: "var(--font-space-mono)" }}>
            Give a topic — Gemini researches it and writes the host's monologue.
          </p>

          <textarea
            value={topic}
            onChange={handleTopicChange}
            placeholder="What should the show be about? Paste a link or describe a topic…"
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

          <button
            type="button"
            onClick={requestSuggestion}
            disabled={isPending}
            className="btn-outlined w-full"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {isPending ? "Thinking…" : topic ? "↻ Suggest a different topic" : "Suggest a topic for me"}
          </button>

          {suggestError && (
            <p className="text-xs text-red-400" style={{ fontFamily: "var(--font-space-mono)" }}>
              {suggestError}
            </p>
          )}

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
      )}

      {scriptMode === "user" && (
        <div className="space-y-3">
          <p className="text-xs text-white/55" style={{ fontFamily: "var(--font-space-mono)" }}>
            Paste the full spoken monologue. Veo will speak it word-for-word, split into {Math.max(1, Math.round(durationSeconds / 8))} clip{Math.round(durationSeconds / 8) === 1 ? "" : "s"} of 8 seconds each.
          </p>

          <textarea
            value={userScript}
            onChange={e => onUserScriptChange(e.target.value)}
            placeholder={`Aim for ~${targetWords} words total (~22 words per 8s clip). Write the lines you want the host to say verbatim…`}
            rows={12}
            className="w-full resize-y rounded-[14px] border border-[var(--border)] bg-white/[0.03] p-4 text-base leading-relaxed text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ fontFamily: "var(--font-body)" }}
          />

          <div className="flex items-center justify-between text-[11px] text-white/55" style={{ fontFamily: "var(--font-space-mono)" }}>
            <span>{wordCount} word{wordCount === 1 ? "" : "s"}</span>
            <span className={wordCount > 0 && Math.abs(wordCount - targetWords) > targetWords * 0.3 ? "text-amber-400" : ""}>
              target ≈ {targetWords} for {durationSeconds}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
