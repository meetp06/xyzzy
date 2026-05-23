"use client";

import type { ShowTemplate } from "@/db/schema";

interface TemplateSelectorProps {
  templates: ShowTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Host {
  name: string;
  personality?: string;
  position?: string;
}

export function TemplateSelector({ templates, selectedId, onSelect }: TemplateSelectorProps) {
  if (templates.length === 0) {
    return (
      <div className="border-3 border-border p-8 text-center">
        <p className="text-foreground-muted">No templates found. Please seed the database first.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map(template => {
        const isSelected = template.id === selectedId;
        const hosts = (template.hosts as Host[]) ?? [];

        return (
          <button
            key={template.id}
            type="button"
            className={`card-brutal cursor-pointer overflow-hidden text-left transition-all ${
              isSelected
                ? "ring-2 ring-accent ring-offset-2"
                : ""
            }`}
            style={{
              borderWidth: isSelected ? "4px" : "3px",
            }}
            onClick={() => onSelect(template.id)}
          >
            {/* Reference image or placeholder */}
            {template.referenceImageUrl ? (
              <div className="border-b-3 border-border">
                <img
                  src={template.referenceImageUrl}
                  alt={template.name}
                  className="h-36 w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex h-36 items-center justify-center border-b-3 border-border"
                style={{
                  background: isSelected
                    ? "var(--accent)"
                    : "var(--surface-elevated)",
                }}
              >
                <span
                  className="text-3xl font-extrabold uppercase tracking-widest opacity-20"
                  style={{ fontFamily: "var(--font-syne)" }}
                >
                  {template.showType === "monologue" ? "SOLO" : "DUO"}
                </span>
              </div>
            )}

            {/* Card body */}
            <div className="p-4">
              <h4
                className="mb-2 text-lg font-extrabold leading-tight"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                {template.name}
              </h4>

              {/* Show type badge */}
              <span
                className={`badge mb-3 ${
                  isSelected ? "bg-accent text-foreground border-foreground" : ""
                }`}
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                {template.showType.toUpperCase()}
              </span>

              {/* Host names */}
              {hosts.length > 0 && (
                <div className="mt-3 border-t-2 border-border pt-3">
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
            </div>
          </button>
        );
      })}
    </div>
  );
}
