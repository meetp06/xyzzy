"use client";

import { DURATION_OPTIONS } from "./constants";

interface DurationSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

export function DurationSelector({ value, onChange }: DurationSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {DURATION_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          className={`tone-btn ${value === option.value ? "active" : ""}`}
          style={{ fontFamily: "var(--font-space-mono)" }}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
