"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteTemplateAction } from "./actions";

import type { ShowTemplate } from "@/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Host {
  name: string;
  personality?: string;
  position?: string;
}

interface TemplateCardProps {
  template: ShowTemplate;
  showCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TemplateCard({ template, showCount }: TemplateCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hosts = (template.hosts as Host[]) ?? [];

  const handleDelete = () => {
    if (!confirm(`Delete template "${template.name}"?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await deleteTemplateAction(template.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="card-brutal overflow-hidden">
      {/* Image / Placeholder */}
      {template.referenceImageUrl ? (
        <div className="border-b-3 border-border">
          <img
            src={template.referenceImageUrl}
            alt={template.name}
            className="h-36 w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-36 items-center justify-center border-b-3 border-border bg-surface-elevated">
          <span
            className="text-3xl font-extrabold uppercase tracking-widest opacity-20"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {template.showType === "monologue" ? "SOLO" : "DUO"}
          </span>
        </div>
      )}

      {/* Card Body */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3
            className="text-lg font-extrabold leading-tight"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            {template.name}
          </h3>
          {template.isDefault && (
            <span
              className="shrink-0 border-2 border-accent bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Default
            </span>
          )}
        </div>

        {/* Badges */}
        <div className="mb-3 flex items-center gap-2">
          <span
            className="badge"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {template.showType.toUpperCase()}
          </span>
          {showCount > 0 && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {showCount} show{showCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Hosts */}
        {hosts.length > 0 && (
          <div className="border-t-2 border-border pt-3">
            <div
              className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {hosts.length === 1 ? "Host" : "Hosts"}
            </div>
            <div className="text-sm text-foreground-muted">
              {hosts.map(h => h.name).join(", ")}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2 border-t-2 border-border pt-3">
          <Link
            href={`/templates/${template.id}/edit`}
            className="border-3 border-border bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--border)]"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="border-3 border-red-600 bg-surface px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-red-600 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_rgb(220,38,38)] disabled:opacity-50"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {isPending ? "..." : "Delete"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-2 border-2 border-red-600 bg-red-50 px-3 py-1.5 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
