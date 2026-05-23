"use client";

import { useState } from "react";
import Markdown from "react-markdown";

import { PlayerProvider } from "@/app/media/[slug]/player/provider";
import { VideoPlayer } from "@/app/media/[slug]/player/ui";

import { ChatPanel } from "./chat/chat-panel";
import { ShowTranscript } from "./show-transcript";
import { DubbingPanel } from "./tts-panel";

import type { GeneratedShow, ShowTemplate } from "@/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface WatchContentProps {
  show: GeneratedShow;
  template: ShowTemplate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function WatchContent({ show, template }: WatchContentProps) {
  const hosts = (template.hosts ?? []) as Array<{ name: string; personality: string; position?: string }>;
  const segments = (show.transcriptSegments ?? []) as TranscriptSegment[];

  return (
    <PlayerProvider>
      <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
        {/* Left Column — Video + Transcript */}
        <div className="space-y-6">
          {/* Mux Player */}
          <div className="border-3 border-border shadow-[6px_6px_0_var(--border)]">
            <VideoPlayer
              playbackId={show.muxPlaybackId!}
              title={show.topic}
            />
          </div>

          {/* Synced Transcript */}
          {segments.length > 0 && (
            <ShowTranscript segments={segments} />
          )}
        </div>

        {/* Right Column — Info Panels */}
        <div className="space-y-6">
          {/* Research Context (collapsed by default) */}
          {show.researchContext && (
            <ResearchPanel content={show.researchContext} />
          )}

          {/* Chat */}
          <ChatPanel
            showId={show.id}
            topic={show.topic}
            transcript={show.transcript ?? ""}
            researchContext={show.researchContext ?? ""}
          />

          {/* Audio Dubbing */}
          {show.transcript && (
            <DubbingPanel
              transcript={show.transcript}
              hosts={hosts}
            />
          )}

          {/* Social Clips — hidden for now */}

          {/* Show Details */}
          <div className="card-flat p-4">
            <div
              className="mb-3 text-[14px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Show Details
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Template</span>
                <span className="font-bold">{template.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Type</span>
                <span className="font-bold capitalize">{template.showType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Duration</span>
                <span className="font-bold">{show.durationSeconds}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Familiarity</span>
                <span className="font-bold capitalize">{show.familiarity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Language</span>
                <span className="font-bold">{show.language?.toUpperCase() ?? "EN"}</span>
              </div>
              {hosts.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Hosts</span>
                  <span className="font-bold">{hosts.map(h => h.name).join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PlayerProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Research Panel (collapsed by default, renders markdown)
// ─────────────────────────────────────────────────────────────────────────────

function ResearchPanel({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card-flat overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between bg-background-dark px-4 py-3 text-white transition-colors hover:brightness-110"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        <span className="text-[14px] font-bold uppercase tracking-[0.2em]">Research</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="square" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="max-h-96 overflow-y-auto p-4">
          <div className="research-md text-sm leading-relaxed text-foreground-muted [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-extrabold [&_h1]:text-foreground [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-extrabold [&_h2]:text-foreground [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-foreground [&_hr]:my-3 [&_hr]:border-border [&_li]:ml-4 [&_li]:list-disc [&_ol>li]:list-decimal [&_p]:mb-2 [&_strong]:font-bold [&_strong]:text-foreground [&_ul]:mb-2">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
