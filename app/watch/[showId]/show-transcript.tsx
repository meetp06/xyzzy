"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { usePlayer } from "@/app/media/[slug]/player/use-player";
import { formatTime } from "@/app/media/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface ShowTranscriptProps {
  segments: TranscriptSegment[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ShowTranscript({ segments }: ShowTranscriptProps) {
  const { currentTime, seekTo } = usePlayer();

  const [showJumpButton, setShowJumpButton] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const containerRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const isAutoScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveIndexRef = useRef<number | null>(null);

  // Find active segment
  const activeIndex = segments.findIndex(
    seg => currentTime >= seg.startTime && currentTime < seg.endTime,
  );

  // Auto-scroll to active segment
  const scrollToActive = useCallback(() => {
    if (activeIndex < 0 || !containerRef.current) return;

    const el = segRefs.current.get(activeIndex);
    if (!el) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;
    const targetScrollTop = el.offsetTop - (containerHeight / 2) + (el.offsetHeight / 2);

    isAutoScrollingRef.current = true;
    container.scrollTo({ top: targetScrollTop, behavior: "smooth" });

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 600);
  }, [activeIndex]);

  // Scroll when active segment changes
  useEffect(() => {
    if (!showJumpButton && activeIndex !== lastActiveIndexRef.current) {
      lastActiveIndexRef.current = activeIndex;
      scrollToActive();
    }
  }, [activeIndex, showJumpButton, scrollToActive]);

  // Detect user scroll away from active segment
  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;
    if (activeIndex < 0 || !containerRef.current) return;

    const el = segRefs.current.get(activeIndex);
    if (!el) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const isAbove = elRect.bottom < containerRect.top;
    const isBelow = elRect.top > containerRect.bottom;

    if (isAbove || isBelow) {
      setScrollDirection(isBelow ? "down" : "up");
      setShowJumpButton(true);
    } else {
      setShowJumpButton(false);
    }
  }, [activeIndex]);

  // Jump to current
  const handleJump = () => {
    setShowJumpButton(false);
    isAutoScrollingRef.current = true;
    scrollToActive();
  };

  // Click to seek
  const handleSegClick = (seg: TranscriptSegment) => {
    setShowJumpButton(false);
    isAutoScrollingRef.current = true;
    seekTo(seg.startTime);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  if (segments.length === 0) return null;

  return (
    <div className="card-brutal relative flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b-3 border-border bg-surface-elevated px-5 py-4">
        <h2
          className="text-lg font-extrabold uppercase leading-tight tracking-tight"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          Transcript
        </h2>
      </div>

      {/* Segments */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative max-h-[300px] overflow-y-auto bg-surface"
      >
        <div className="divide-y divide-border/30">
          {segments.map((seg, i) => (
            <motion.div
              key={i}
              ref={(el) => {
                if (el) segRefs.current.set(i, el);
                else segRefs.current.delete(i);
              }}
              onClick={() => handleSegClick(seg)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSegClick(seg);
                }
              }}
              className="group relative flex cursor-pointer gap-4 overflow-hidden px-5 py-3"
              initial={false}
              animate={{
                backgroundColor: activeIndex === i
                  ? "var(--surface-elevated)"
                  : "transparent",
              }}
              whileHover={{ backgroundColor: "var(--surface-elevated)" }}
              transition={{ duration: 0.2 }}
            >
              {/* Active bar */}
              <motion.div
                className="absolute inset-y-0 left-0 w-1"
                initial={false}
                animate={{
                  scaleY: activeIndex === i ? 1 : 0,
                  backgroundColor: activeIndex === i ? "var(--accent)" : "transparent",
                }}
                transition={{
                  scaleY: { type: "spring", stiffness: 500, damping: 30 },
                  backgroundColor: { duration: 0.2 },
                }}
                style={{ originY: 0.5 }}
              />

              {/* Timestamp */}
              <motion.span
                className="shrink-0 pt-0.5 text-xs"
                style={{ fontFamily: "var(--font-space-mono)" }}
                initial={false}
                animate={{
                  color: activeIndex === i ? "var(--accent)" : "var(--foreground-muted)",
                }}
                transition={{ duration: 0.15 }}
              >
                {formatTime(seg.startTime)}
              </motion.span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <span
                  className="text-xs font-bold uppercase tracking-wider text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {seg.speaker}
                </span>
                <p className="mt-0.5 text-sm leading-relaxed text-foreground">
                  {seg.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Jump to current CTA */}
      <AnimatePresence>
        {showJumpButton && activeIndex >= 0 && (
          <motion.button
            type="button"
            onClick={handleJump}
            className="absolute bottom-4 left-1/2 z-10 flex items-center gap-2 border-3 border-border bg-accent px-4 py-2 text-sm font-bold text-foreground shadow-[4px_4px_0_var(--border)]"
            initial={{ opacity: 0, y: 20, x: "-50%", scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: 10, x: "-50%", scale: 0.95 }}
            whileHover={{ y: -2, boxShadow: "6px 6px 0 var(--border)" }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 28 }}
          >
            <motion.svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              animate={{ rotate: scrollDirection === "down" ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M5 12l7-7 7 7M12 5v14"
              />
            </motion.svg>
            Jump to current
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
