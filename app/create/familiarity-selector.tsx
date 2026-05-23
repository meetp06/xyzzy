"use client";

import { FAMILIARITY_OPTIONS } from "./constants";

interface FamiliaritySelectorProps {
  value: string;
  onChange: (v: string) => void;
}

export function FamiliaritySelector({ value, onChange }: FamiliaritySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {FAMILIARITY_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          className={`tone-btn text-left ${value === option.value ? "active" : ""}`}
          style={{ fontFamily: "var(--font-space-mono)" }}
          onClick={() => onChange(option.value)}
        >
          <div className="text-xs font-bold">{option.label}</div>
          <div
            className={`mt-1 text-[10px] font-normal normal-case tracking-normal ${
              value === option.value ? "opacity-70" : "text-foreground-muted"
            }`}
          >
            {option.description}
          </div>
        </button>
      ))}
    </div>
  );
}
