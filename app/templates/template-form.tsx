"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createTemplateAction, updateTemplateAction } from "./actions";

import type { ShowTemplate } from "@/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Host {
  name: string;
  personality: string;
  position: string;
}

interface TemplateFormProps {
  template?: ShowTemplate;
}

const EMPTY_HOST: Host = { name: "", personality: "", position: "" };

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const existingHosts = template
    ? (template.hosts as Array<{ name: string; personality?: string; position?: string }>).map(h => ({
        name: h.name,
        personality: h.personality ?? "",
        position: h.position ?? "",
      }))
    : [{ ...EMPTY_HOST }];

  const [name, setName] = useState(template?.name ?? "");
  const [showType, setShowType] = useState(template?.showType ?? "monologue");
  const [referenceImageUrl, setReferenceImageUrl] = useState(template?.referenceImageUrl ?? "");
  const [notes, setNotes] = useState(template?.notes ?? "");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [hosts, setHosts] = useState<Host[]>(existingHosts);

  const isEdit = Boolean(template);

  const updateHost = (index: number, field: keyof Host, value: string) => {
    setHosts(prev => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const addHost = () => {
    setHosts(prev => [...prev, { ...EMPTY_HOST }]);
  };

  const removeHost = (index: number) => {
    setHosts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const data = {
      name,
      showType,
      referenceImageUrl: referenceImageUrl || undefined,
      hosts: hosts.map(h => ({
        name: h.name,
        personality: h.personality || undefined,
        position: h.position || undefined,
      })),
      notes: notes || undefined,
      isDefault,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateTemplateAction(template!.id, data)
        : await createTemplateAction(data);

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/templates");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      {/* Name */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Template Name *
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., Late Night with John Oliver"
          className="w-full border-3 border-border bg-surface p-4 text-base text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
          style={{ fontFamily: "var(--font-space-mono)" }}
        />
      </div>

      {/* Show Type */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Show Type *
        </label>
        <div className="flex gap-2">
          {(["monologue", "conversation"] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setShowType(type)}
              className={`border-3 border-border px-5 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
                showType === type
                  ? "bg-accent shadow-[3px_3px_0_var(--border)]"
                  : "bg-surface hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)]"
              }`}
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Reference Image URL */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Reference Image URL
        </label>
        <input
          type="text"
          value={referenceImageUrl}
          onChange={e => setReferenceImageUrl(e.target.value)}
          placeholder="https://..."
          className="w-full border-3 border-border bg-surface p-4 text-base text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
          style={{ fontFamily: "var(--font-space-mono)" }}
        />
      </div>

      {/* Hosts */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Hosts *
        </label>
        <div className="space-y-4">
          {hosts.map((host, i) => (
            <div key={i} className="border-3 border-border bg-surface p-4">
              <div className="mb-3 flex items-center justify-between">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  Host {i + 1}
                </span>
                {hosts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHost(i)}
                    className="text-xs font-bold uppercase tracking-wider text-red-600 hover:underline"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Host Name */}
              <input
                type="text"
                value={host.name}
                onChange={e => updateHost(i, "name", e.target.value)}
                placeholder="Host name"
                className="mb-3 w-full border-2 border-border bg-surface-elevated p-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ fontFamily: "var(--font-space-mono)" }}
              />

              {/* Personality */}
              <textarea
                value={host.personality}
                onChange={e => updateHost(i, "personality", e.target.value)}
                placeholder="Personality & style description for AI generation..."
                rows={3}
                className="mb-3 w-full resize-y border-2 border-border bg-surface-elevated p-3 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
                style={{ fontFamily: "var(--font-space-mono)" }}
              />

              {/* Position */}
              <div className="flex gap-2">
                {["left", "center", "right"].map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => updateHost(i, "position", host.position === pos ? "" : pos)}
                    className={`border-2 border-border px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
                      host.position === pos
                        ? "bg-accent"
                        : "bg-surface-elevated hover:bg-surface"
                    }`}
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addHost}
            className="w-full border-3 border-dashed border-border bg-surface px-4 py-3 text-sm font-bold uppercase tracking-wider text-foreground-muted transition-all hover:border-solid hover:bg-surface-elevated"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            + Add Host
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Notes
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Format notes, segment structure, tone guidance..."
          rows={4}
          className="w-full resize-y border-3 border-border bg-surface p-4 text-base text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-accent"
          style={{ fontFamily: "var(--font-space-mono)" }}
        />
      </div>

      {/* Is Default */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={e => setIsDefault(e.target.checked)}
          className="h-5 w-5 accent-accent"
        />
        <span
          className="text-xs font-bold uppercase tracking-[0.2em] text-foreground-muted"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Mark as Default Template
        </span>
      </label>

      {/* Error */}
      {error && (
        <div className="border-3 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="border-3 border-border bg-accent px-8 py-3 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_var(--border)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--border)] disabled:opacity-50"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          {isPending ? "Saving..." : isEdit ? "Update Template" : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="border-3 border-border bg-surface px-8 py-3 text-sm font-bold uppercase tracking-wider transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)]"
          style={{ fontFamily: "var(--font-space-mono)" }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
