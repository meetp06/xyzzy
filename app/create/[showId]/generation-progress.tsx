"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { GeneratedShow, ShowTemplate } from "@/db/schema";

import { pollShowStatusAction } from "./actions";
import { GENERATION_STEPS, POLL_INTERVAL } from "./constants";
import { TVLoading } from "./tv-loading";

import type { GenerationStepId } from "./constants";

interface GenerationProgressProps {
  show: GeneratedShow;
  template: ShowTemplate;
}

const STATUS_TO_STEP: Record<string, GenerationStepId | null> = {
  pending: null,
  researching: "research",
  scripting: "script",
  framing: "frame-chain",
  generating: "generate-clips",
  stitching: "stitch",
  uploading: "upload",
  ready: null,
  failed: null,
};

function getStepOrder(useFrameChaining: boolean): GenerationStepId[] {
  if (useFrameChaining) {
    return ["research", "script", "frame-chain", "generate-clips", "stitch", "upload"];
  }
  return ["research", "script", "generate-clips", "stitch", "upload"];
}

function getCompletedSteps(status: string, useFrameChaining: boolean): GenerationStepId[] {
  const stepOrder = getStepOrder(useFrameChaining);
  const currentStep = STATUS_TO_STEP[status];

  if (status === "ready") return [...stepOrder];
  if (!currentStep) return [];

  const currentIndex = stepOrder.indexOf(currentStep);
  return stepOrder.slice(0, currentIndex);
}

export function GenerationProgress({ show, template }: GenerationProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState(show.status);
  const [error, setError] = useState<string | undefined>(show.error ?? undefined);

  const poll = useCallback(async () => {
    const result = await pollShowStatusAction(show.id);
    setStatus(result.status);
    if (result.error) setError(result.error);

    if (result.status === "ready" && result.muxPlaybackId) {
      // Redirect to watch page after a brief delay
      setTimeout(() => {
        router.push(`/watch/${show.id}`);
      }, 1500);
    }
  }, [show.id, router]);

  useEffect(() => {
    if (status === "ready" || status === "failed") return;

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, poll]);

  const useFrameChaining = show.useFrameChaining ?? false;
  const completedSteps = getCompletedSteps(status, useFrameChaining);
  const currentStep = STATUS_TO_STEP[status];
  const visibleSteps = GENERATION_STEPS.filter(
    s => s.id !== "frame-chain" || useFrameChaining,
  );

  return (
    <div className="space-y-8">
      {/* TV Loading Animation */}
      <TVLoading
        templateName={template.name}
        topic={show.topic}
        status={status}
      />

      {/* Step Progress */}
      <div className="mx-auto max-w-md">
        <div className="card-flat p-5">
          <div
            className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            Pipeline Progress
          </div>

          <div className="space-y-3">
            {visibleSteps.map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center border-2 border-border">
                    {isCompleted ? (
                      <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="square" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isCurrent ? (
                      <div className="h-2 w-2 animate-pulse bg-accent" />
                    ) : (
                      <div className="h-2 w-2 bg-foreground-light/30" />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-xs font-bold uppercase tracking-[0.1em] ${
                      isCompleted ? "text-foreground" : isCurrent ? "text-accent" : "text-foreground-muted"
                    }`}
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 border-3 border-red-600 bg-red-50 p-4">
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-600"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Error
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Ready state */}
        {status === "ready" && (
          <div className="mt-4 border-3 border-green-600 bg-green-50 p-4 text-center">
            <div
              className="text-sm font-bold text-green-700"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Redirecting to your show...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
