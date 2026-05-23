"use server";

import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/app/lib/env";
import * as schema from "@/db/schema";
import type { ShowTemplate } from "@/db/schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─────────────────────────────────────────────────────────────────────────────
// Get Templates
// ─────────────────────────────────────────────────────────────────────────────

export async function getTemplatesAction(): Promise<ShowTemplate[]> {
  try {
    const templates = await db
      .select()
      .from(schema.showTemplates)
      .orderBy(desc(schema.showTemplates.isDefault), asc(schema.showTemplates.createdAt));

    return templates;
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggest Topic (AI-generated)
// ─────────────────────────────────────────────────────────────────────────────

interface SuggestTopicResult {
  topic?: string;
  error?: string;
}

export async function suggestTopicAction(templateName?: string): Promise<SuggestTopicResult> {
  try {
    const { generateText } = await import("@/app/lib/gemini");
    const hostHint = templateName ? `The host is "${templateName}". ` : "";
    const prompt = `${hostHint}Suggest ONE original, current, interesting topic for a short talk-show monologue. The topic should be specific enough to research and discuss for 30-60 seconds.

Rules:
- Return ONLY the topic itself as a single sentence (10-25 words).
- No quote marks. No prefix like "Topic:" or numbering.
- Avoid celebrity names, politicians, or recent breaking news that may be outdated.
- Prefer evergreen but interesting subjects: tech trends, cultural observations, science curiosities, business shifts, everyday absurdities.
- Be specific, not generic. ("Why grocery store self-checkouts are quietly disappearing" beats "Self-checkout machines".)`;

    const topic = await generateText(prompt, "You are an editor pitching talk-show segments. Output only the topic line.");
    return { topic: topic.trim().replace(/^["']|["']$/g, "") };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to suggest topic";
    console.error("[suggestTopicAction]", message);
    return { error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Show
// ─────────────────────────────────────────────────────────────────────────────

interface CreateShowInput {
  templateId: string;
  topic: string;
  topicType: string;
  durationSeconds: number;
  familiarity: string;
  useFrameChaining?: boolean;
  /** When set, skip AI research+script and use this verbatim as the spoken transcript. */
  userScript?: string;
}

interface UserSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  clipIndex?: number;
}

/**
 * Splits raw user-supplied script text into N evenly-sized 8-second clip segments.
 * Splits on word boundaries; trims; uses the template's first host name as speaker.
 */
function splitScriptIntoSegments(script: string, clipCount: number, speaker: string): UserSegment[] {
  const words = script.trim().split(/\s+/).filter(Boolean);
  const wordsPerClip = Math.max(1, Math.ceil(words.length / clipCount));
  const segments: UserSegment[] = [];
  for (let i = 0; i < clipCount; i++) {
    const slice = words.slice(i * wordsPerClip, (i + 1) * wordsPerClip).join(" ");
    if (!slice) break;
    segments.push({
      speaker,
      text: slice,
      startTime: i * 8,
      endTime: (i + 1) * 8,
      clipIndex: i,
    });
  }
  return segments;
}

interface CreateShowResult {
  showId?: string;
  error?: string;
}

export async function createShowAction(formData: CreateShowInput): Promise<CreateShowResult> {
  // Validate input
  if (!formData.templateId || formData.templateId.trim().length === 0) {
    return { error: "Please select a template." };
  }

  if (!formData.topic || formData.topic.trim().length === 0) {
    return { error: "Please enter a topic." };
  }

  const validTopicTypes = ["freetext", "news_link", "hacker_news"];
  if (!validTopicTypes.includes(formData.topicType)) {
    return { error: "Invalid topic type." };
  }

  const validDurations = [16, 24, 32, 48, 64, 96];
  if (!validDurations.includes(formData.durationSeconds)) {
    return { error: "Invalid duration." };
  }

  const validFamiliarities = ["beginner", "familiar", "expert"];
  if (!validFamiliarities.includes(formData.familiarity)) {
    return { error: "Invalid familiarity level." };
  }

  try {
    // If user supplied a script, pre-populate transcript + segments so the
    // workflow short-circuits research + scripting steps.
    let preTranscript: string | undefined;
    let preSegments: UserSegment[] | undefined;
    if (formData.userScript && formData.userScript.trim().length > 0) {
      const template = await db.query.showTemplates.findFirst({
        where: eq(schema.showTemplates.id, formData.templateId),
      });
      const hosts = (template?.hosts as Array<{ name: string }>) ?? [];
      const speaker = hosts[0]?.name ?? "Host";
      const clipCount = Math.max(1, Math.round(formData.durationSeconds / 8));
      preSegments = splitScriptIntoSegments(formData.userScript, clipCount, speaker);
      preTranscript = preSegments.map(s => `[${s.speaker}]: ${s.text}`).join("\n\n");
    }

    const [show] = await db
      .insert(schema.generatedShows)
      .values({
        templateId: formData.templateId,
        topic: formData.topic.trim(),
        topicType: formData.topicType,
        durationSeconds: formData.durationSeconds,
        familiarity: formData.familiarity,
        useFrameChaining: formData.useFrameChaining ?? false,
        status: "pending",
        ...(preTranscript ? { transcript: preTranscript, transcriptSegments: preSegments } : {}),
      })
      .returning({ id: schema.generatedShows.id });

    // Start the generation workflow
    try {
      // eslint-disable-next-line node/no-process-env
      const workflowUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/workflows/generate-show`;
      console.log("[createShowAction] Starting workflow at:", workflowUrl, "showId:", show.id);

      const res = await fetch(workflowUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showId: show.id }),
      });
      const data = await res.json();
      console.log("[createShowAction] Workflow response:", res.status, JSON.stringify(data));

      if (data.runId) {
        await db
          .update(schema.generatedShows)
          .set({ workflowRunId: data.runId })
          .where(eq(schema.generatedShows.id, show.id));
        console.log("[createShowAction] Saved runId:", data.runId);
      } else if (data.error) {
        console.error("[createShowAction] Workflow returned error:", data.error);
      }
    } catch (err) {
      console.error("[createShowAction] Failed to start generation workflow:", err);
      // Show was created — the user can retry from the progress page
    }

    return { showId: show.id };
  } catch (error) {
    console.error("Failed to create show:", error);
    const message = error instanceof Error ? error.message : "Failed to create show.";
    return { error: message };
  }
}
