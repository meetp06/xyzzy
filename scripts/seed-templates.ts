/* eslint-disable no-console, node/no-process-env */
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { GoogleGenAI } from "@google/genai";

import * as schema from "../db/schema";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

const IMAGEN_MODEL = "imagen-4.0-generate-001";

interface GenericTemplate {
  slug: string;
  name: string;
  hostName: string;
  imagenPrompt: string;
  hosts: schema.NewShowTemplate["hosts"];
  notes: string;
}

const GENERIC_PERSONALITY = "An adaptive late-night talk show host. Mirror the energy and tone the topic deserves — sharp when the topic is absurd, measured when it's serious, irreverent when it's pompous. Treat every monologue as if the host has just read the research themselves and is reacting honestly. No catchphrases, no fixed mannerisms — voice emerges from the material.";

const TEMPLATES: GenericTemplate[] = [
  {
    slug: "host-ava",
    name: "Host: Ava",
    hostName: "Ava",
    imagenPrompt: "Studio portrait of a 30-year-old woman, mid-length dark hair, friendly intelligent face, wearing a charcoal blazer over a white shirt, seated behind a modern late-night talk show desk, warm studio key light from camera-left, slight rim light, professional broadcast quality, sharp focus, clean dark blurred background, photoreal, no text, no logos",
    hosts: [{ name: "Ava", personality: GENERIC_PERSONALITY, position: "center" }],
    notes: "Solo monologue. Modern minimalist desk. Host adapts entirely to the topic and research — no built-in style assumptions.",
  },
  {
    slug: "host-marcus",
    name: "Host: Marcus",
    hostName: "Marcus",
    imagenPrompt: "Studio portrait of a 35-year-old man, short dark hair, clean-shaven, calm composed expression, wearing a navy suit with open collar shirt, seated behind a modern late-night talk show desk, warm studio key light from camera-left, slight rim light, professional broadcast quality, sharp focus, clean dark blurred background, photoreal, no text, no logos",
    hosts: [{ name: "Marcus", personality: GENERIC_PERSONALITY, position: "center" }],
    notes: "Solo monologue. Modern minimalist desk. Host adapts entirely to the topic and research — no built-in style assumptions.",
  },
  {
    slug: "host-leo",
    name: "Host: Leo",
    hostName: "Leo",
    imagenPrompt: "Studio portrait of a 28-year-old man, light brown hair tousled, trimmed beard, warm half-smile, wearing a heather grey crewneck under an unbuttoned olive blazer, seated behind a modern late-night talk show desk, warm studio key light from camera-left, slight rim light, professional broadcast quality, sharp focus, clean dark blurred background, photoreal, no text, no logos",
    hosts: [{ name: "Leo", personality: GENERIC_PERSONALITY, position: "center" }],
    notes: "Solo monologue. Modern minimalist desk. Host adapts entirely to the topic and research — no built-in style assumptions.",
  },
];

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY required");
  return new GoogleGenAI({ apiKey });
}

async function generatePortrait(client: GoogleGenAI, prompt: string, destPath: string): Promise<void> {
  console.log(`  → Imagen: generating ${path.basename(destPath)}...`);
  const res = await client.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: { numberOfImages: 1, aspectRatio: "1:1" },
  });
  const img = res.generatedImages?.[0]?.image;
  if (!img?.imageBytes) throw new Error("Imagen returned no image bytes");
  writeFileSync(destPath, Buffer.from(img.imageBytes, "base64"));
  console.log(`  ✓ Saved ${destPath}`);
}

async function seed(): Promise<void> {
  console.log("Wiping existing shows + templates (shows cascade to clips/chat)...");
  const wipedShows = await db.delete(schema.generatedShows).returning({ id: schema.generatedShows.id });
  console.log(`  ✓ Deleted ${wipedShows.length} shows`);
  const wiped = await db.delete(schema.showTemplates).returning({ id: schema.showTemplates.id });
  console.log(`  ✓ Deleted ${wiped.length} templates\n`);

  const templatesDir = path.join(process.cwd(), "public", "templates");
  mkdirSync(templatesDir, { recursive: true });

  const client = getClient();

  console.log("Generating portraits + inserting templates...\n");
  for (const t of TEMPLATES) {
    const destPath = path.join(templatesDir, `${t.slug}.png`);
    try {
      await generatePortrait(client, t.imagenPrompt, destPath);
    } catch (err) {
      console.warn(`  ⚠  Portrait failed for ${t.slug}, continuing with no image:`, err instanceof Error ? err.message : err);
    }

    await db.insert(schema.showTemplates).values({
      name: t.name,
      showType: "monologue",
      referenceImageUrl: `/templates/${t.slug}.png`,
      hosts: t.hosts,
      notes: t.notes,
      isDefault: true,
    });
    console.log(`  ✓ Inserted "${t.name}"\n`);
  }

  console.log("Done.");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  pool.end().catch(() => {});
  process.exit(1);
});
