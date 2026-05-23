"use client";

import { useCallback } from "react";

import { TOPIC_TYPES } from "./constants";

interface TopicInputProps {
  topic: string;
  topicType: string;
  onTopicChange: (value: string) => void;
  onTopicTypeChange: (value: string) => void;
}

function detectTopicType(value: string): string {
  if (value.includes("news.ycombinator.com")) {
    return TOPIC_TYPES.hacker_news;
  }
  if (value.trimStart().startsWith("http")) {
    return TOPIC_TYPES.news_link;
  }
  return TOPIC_TYPES.freetext;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case TOPIC_TYPES.hacker_news:
      return "Hacker News Link";
    case TOPIC_TYPES.news_link:
      return "News Link";
    case TOPIC_TYPES.freetext:
    default:
      return "Free Text";
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case TOPIC_TYPES.hacker_news:
      return "#ff6600";
    case TOPIC_TYPES.news_link:
      return "#1c65be";
    case TOPIC_TYPES.freetext:
    default:
      return "var(--foreground-muted)";
  }
}

export function TopicInput({ topic, topicType, onTopicChange, onTopicTypeChange }: TopicInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      onTopicChange(value);
      const detected = detectTopicType(value);
      if (detected !== topicType) {
        onTopicTypeChange(detected);
      }
    },
    [topicType, onTopicChange, onTopicTypeChange],
  );

  return (
    <div>
      <textarea
        value={topic}
        onChange={handleChange}
        placeholder="What should the show be about? Paste a link or describe a topic..."
        rows={5}
        className="w-full resize-none border-3 border-border bg-surface p-4 text-base leading-relaxed text-foreground placeholder:text-foreground-light focus:outline-none focus:ring-2 focus:ring-accent"
        style={{ fontFamily: "var(--font-syne)" }}
      />

      {/* Detected type indicator */}
      {topic.trim().length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 border border-border"
            style={{ backgroundColor: getTypeColor(topicType) }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-foreground-muted"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            Detected: {getTypeLabel(topicType)}
          </span>
        </div>
      )}
    </div>
  );
}
