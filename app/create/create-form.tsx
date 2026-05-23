"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ShowTemplate } from "@/db/schema";

import { createShowAction } from "./actions";
import { DurationSelector } from "./duration-selector";
import { FamiliaritySelector } from "./familiarity-selector";
import { TemplateSelector } from "./template-selector";
import { TopicInput } from "./topic-input";

const STEPS = [
  { number: 1, label: "Template" },
  { number: 2, label: "Topic" },
  { number: 3, label: "Configure" },
  { number: 4, label: "Review" },
];

interface CreateFormProps {
  templates: ShowTemplate[];
}

export function CreateForm({ templates }: CreateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [topicType, setTopicType] = useState("freetext");
  const [durationSeconds, setDurationSeconds] = useState(16);
  const [familiarity, setFamiliarity] = useState("familiar");
  const [useFrameChaining, setUseFrameChaining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find(t => t.id === templateId);

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return templateId !== null;
      case 2:
        return topic.trim().length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  }

  function handleNext() {
    if (step < 4 && canAdvance()) {
      setStep(step + 1);
      setError(null);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  }

  function handleSubmit() {
    if (!templateId || !topic.trim()) return;

    setError(null);
    startTransition(async () => {
      const result = await createShowAction({
        templateId,
        topic: topic.trim(),
        topicType,
        durationSeconds,
        familiarity,
        useFrameChaining,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.showId) {
        router.push(`/create/${result.showId}`);
      }
    });
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center border-3 border-border text-sm font-extrabold transition-colors ${
                    step >= s.number
                      ? "bg-foreground text-surface"
                      : "bg-surface text-foreground-muted"
                  }`}
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {s.number}
                </div>
                <span
                  className={`mt-2 text-[10px] font-bold uppercase tracking-[0.15em] ${
                    step >= s.number ? "text-foreground" : "text-foreground-muted"
                  }`}
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {s.label}
                </span>
              </div>

              {/* Connecting line */}
              {i < STEPS.length - 1 && (
                <div
                  className={`mb-6 h-[3px] w-12 md:w-20 ${
                    step > s.number ? "bg-foreground" : "bg-border/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="panel-brutal p-6 md:p-8">
        {step === 1 && (
          <div>
            <h3
              className="mb-6 text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Pick a show template
            </h3>
            <TemplateSelector
              templates={templates}
              selectedId={templateId}
              onSelect={setTemplateId}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h3
              className="mb-6 text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              What should the show cover?
            </h3>
            <TopicInput
              topic={topic}
              topicType={topicType}
              onTopicChange={setTopic}
              onTopicTypeChange={setTopicType}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <h3
              className="mb-6 text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Configure your show
            </h3>
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <label
                  className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Duration
                </label>
                <DurationSelector value={durationSeconds} onChange={setDurationSeconds} />
              </div>
              <div>
                <label
                  className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Familiarity
                </label>
                <FamiliaritySelector value={familiarity} onChange={setFamiliarity} />
              </div>
            </div>

            {/* Frame Chaining Toggle */}
            <div className="mt-8">
              <label
                className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                Visual Consistency
              </label>
              <button
                type="button"
                className={`tone-btn w-full text-left ${useFrameChaining ? "active" : ""}`}
                style={{ fontFamily: "var(--font-space-mono)" }}
                onClick={() => setUseFrameChaining(!useFrameChaining)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">Frame Chaining</div>
                    <div className="mt-1 text-xs opacity-70">
                      Generates an anchor clip first, then uses its start/end frames to keep all segments visually consistent
                    </div>
                  </div>
                  <div
                    className={`ml-4 flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-border transition-colors ${
                      useFrameChaining ? "bg-foreground" : "bg-surface"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full border border-border transition-transform ${
                        useFrameChaining ? "translate-x-5 bg-surface" : "translate-x-0.5 bg-foreground-muted"
                      }`}
                    />
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3
              className="mb-6 text-2xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Review & create
            </h3>

            <div className="space-y-4">
              {/* Template */}
              <div className="border-3 border-border p-4">
                <div
                  className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Template
                </div>
                <div className="font-bold" style={{ fontFamily: "var(--font-syne)" }}>
                  {selectedTemplate?.name ?? "—"}
                </div>
                {selectedTemplate && (
                  <span
                    className="badge mt-2"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    {selectedTemplate.showType.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Topic */}
              <div className="border-3 border-border p-4">
                <div
                  className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Topic
                </div>
                <div className="font-medium">{topic || "—"}</div>
                <span
                  className="badge mt-2"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {topicType.replace("_", " ").toUpperCase()}
                </span>
              </div>

              {/* Settings */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border-3 border-border p-4">
                  <div
                    className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Duration
                  </div>
                  <div className="font-bold" style={{ fontFamily: "var(--font-syne)" }}>
                    {durationSeconds}s
                  </div>
                </div>
                <div className="border-3 border-border p-4">
                  <div
                    className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Familiarity
                  </div>
                  <div className="font-bold capitalize" style={{ fontFamily: "var(--font-syne)" }}>
                    {familiarity}
                  </div>
                </div>
              </div>

              {/* Frame Chaining indicator */}
              {useFrameChaining && (
                <div className="border-3 border-border p-4">
                  <div
                    className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Visual Consistency
                  </div>
                  <div className="font-bold" style={{ fontFamily: "var(--font-syne)" }}>
                    Frame Chaining ON
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                className="mt-6 border-3 border-red-600 bg-red-50 p-4 text-sm font-bold text-red-600"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          {step > 1 && (
            <button
              type="button"
              className="btn-outlined"
              style={{ fontFamily: "var(--font-space-mono)" }}
              onClick={handleBack}
            >
              Back
            </button>
          )}
        </div>

        <div>
          {step < 4 ? (
            <button
              type="button"
              className="btn-action"
              style={{ fontFamily: "var(--font-space-mono)" }}
              disabled={!canAdvance()}
              onClick={handleNext}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="btn-action"
              style={{ fontFamily: "var(--font-space-mono)" }}
              disabled={isPending}
              onClick={handleSubmit}
            >
              {isPending ? "Creating..." : "Create Show"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
