export type GenerationStepId = "research" | "script" | "frame-chain" | "generate-clips" | "stitch" | "upload";

export const GENERATION_STEPS: { id: GenerationStepId; label: string }[] = [
  { id: "research", label: "Researching topic" },
  { id: "script", label: "Writing transcript" },
  { id: "frame-chain", label: "Generating anchor clip" },
  { id: "generate-clips", label: "Generating video clips" },
  { id: "stitch", label: "Stitching clips" },
  { id: "upload", label: "Uploading to Mux" },
];

export const POLL_INTERVAL = 2000;
