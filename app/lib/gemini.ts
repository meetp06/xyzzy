import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  GoogleGenAI,
  PersonGeneration,
  VideoGenerationReferenceType,
  type GenerateVideosConfig,
  type Image,
} from "@google/genai";

import { env } from "./env";

// ─────────────────────────────────────────────────────────────────────────────
// Model selection
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_MODEL = "gemini-3.5-flash";
const VEO_MODEL_DEFAULT = "veo-3.1-generate-preview";
const VEO_MODEL_REFERENCE = "veo-3.1-generate-preview";
const VEO_MODEL_INTERPOLATION = "veo-3.1-generate-preview";

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter — Veo Video Generation
// ─────────────────────────────────────────────────────────────────────────────

// Per-key rate limiter. Default 2 RPM (free tier). Override via VEO_RPM env.
const VEO_RPM_PER_KEY = Number(process.env.VEO_RPM ?? 2);
const VEO_WINDOW_MS = 60_000;
const veoCallTimestampsByKey = new Map<string, number[]>();

export function _resetRateLimiter(): void {
  veoCallTimestampsByKey.clear();
  apiKeyCursor = 0;
}

function getApiKeyPool(): string[] {
  const poolEnv = process.env.GOOGLE_GENERATIVE_AI_API_KEYS;
  if (poolEnv) {
    const keys = poolEnv.split(",").map(k => k.trim()).filter(Boolean);
    if (keys.length > 0) return keys;
  }
  const single = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!single) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEYS required");
  return [single];
}

let apiKeyCursor = 0;
function nextApiKey(): string {
  const pool = getApiKeyPool();
  const key = pool[apiKeyCursor % pool.length];
  apiKeyCursor++;
  return key;
}

const clientsByKey = new Map<string, GoogleGenAI>();
function clientFor(apiKey: string): GoogleGenAI {
  const existing = clientsByKey.get(apiKey);
  if (existing) return existing;
  const client = new GoogleGenAI({ apiKey });
  clientsByKey.set(apiKey, client);
  return client;
}

async function waitForVeoSlot(apiKey: string): Promise<void> {
  let timestamps = veoCallTimestampsByKey.get(apiKey);
  if (!timestamps) {
    timestamps = [];
    veoCallTimestampsByKey.set(apiKey, timestamps);
  }

  const now = Date.now();
  while (timestamps.length > 0 && now - timestamps[0] > VEO_WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= VEO_RPM_PER_KEY) {
    const oldestInWindow = timestamps[0];
    const waitMs = oldestInWindow + VEO_WINDOW_MS - now + 1_000;
    const keyTail = apiKey.slice(-4);
    console.log(`[gemini] Rate limit on key ...${keyTail}: ${timestamps.length}/${VEO_RPM_PER_KEY} RPM used, waiting ${(waitMs / 1000).toFixed(0)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  timestamps.push(Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────
// Client + retry helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a client backed by the next key in the round-robin pool.
 * For text/chat/TTS — single call, no rate limit handling needed beyond Gemini's own.
 */
export function getGenAIClient(): GoogleGenAI {
  return clientFor(nextApiKey());
}

/** Inspect the size of the configured key pool (for diagnostics). */
export function getApiKeyPoolSize(): number {
  return getApiKeyPool().length;
}

function isRetriableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("EAI_AGAIN") ||
    msg.includes("UND_ERR_SOCKET") ||
    msg.includes("UND_ERR_CONNECT_TIMEOUT") ||
    msg.includes("network socket disconnected") ||
    /\b5\d\d\b/.test(msg)
  );
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetriableError(err)) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[gemini] ${opts.label ?? "request"} attempt ${attempt}/${maxAttempts} failed (${err instanceof Error ? err.message : String(err)}). Retrying in ${delay}ms...`,
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Video Generation — Veo
// ─────────────────────────────────────────────────────────────────────────────

export interface VideoClipResult {
  videoUrl: string;
  localPath: string;
}

export class VeoQuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VeoQuotaExhaustedError";
  }
}

export class VeoRAIFilterError extends Error {
  reasons: string[];
  constructor(reasons: string[]) {
    super(`Content filter: ${reasons.join("; ")}`);
    this.name = "VeoRAIFilterError";
    this.reasons = reasons;
  }
}

function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === ".jpg" || e === ".jpeg") return "image/jpeg";
  if (e === ".webp") return "image/webp";
  if (e === ".gif") return "image/gif";
  return "image/png";
}

async function loadReferenceImageBase64(
  source: string,
): Promise<{ base64: string; mimeType: string } | null> {
  // 1. Remote URL: fetch bytes
  if (/^https?:\/\//i.test(source)) {
    try {
      const res = await withRetry(() => fetch(source), { label: "ref image fetch" });
      if (!res.ok) {
        console.warn("[gemini] Reference image fetch failed:", res.status, source);
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") ?? "";
      const mimeType = contentType.startsWith("image/")
        ? contentType.split(";")[0]
        : mimeFromExt(path.extname(new URL(source).pathname));
      return { base64: buf.toString("base64"), mimeType };
    } catch (err) {
      console.warn("[gemini] Reference image fetch threw:", err instanceof Error ? err.message : err);
      return null;
    }
  }

  // 2. Path starting with "/" (relative to /public) — covers uploaded files
  if (source.startsWith("/")) {
    const publicCandidate = path.join(process.cwd(), "public", source);
    if (fs.existsSync(publicCandidate)) {
      return {
        base64: fs.readFileSync(publicCandidate).toString("base64"),
        mimeType: mimeFromExt(path.extname(publicCandidate)),
      };
    }
  }

  // 3. Absolute local path
  if (path.isAbsolute(source) && fs.existsSync(source)) {
    return {
      base64: fs.readFileSync(source).toString("base64"),
      mimeType: mimeFromExt(path.extname(source)),
    };
  }

  // 4. Slug → assets/reference-images/{slug}.{ext}
  const baseDir = path.join(process.cwd(), "assets", "reference-images");
  const slug = source.replace(/\.[^.]+$/, "").split("/").pop() ?? source;
  const extensions = [".png", ".jpeg", ".jpg", ".webp"];
  for (const ext of extensions) {
    const candidate = path.join(baseDir, `${slug}${ext}`);
    if (fs.existsSync(candidate)) {
      return {
        base64: fs.readFileSync(candidate).toString("base64"),
        mimeType: mimeFromExt(ext),
      };
    }
  }

  console.warn("[gemini] Reference image not found for source:", source);
  return null;
}

function classifyVeoError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || /\bquota\b/i.test(msg)) {
    throw new VeoQuotaExhaustedError(msg);
  }
  throw err;
}

async function downloadVideoFile(
  client: GoogleGenAI,
  videoFile: { uri?: string; videoBytes?: string } | undefined,
): Promise<VideoClipResult> {
  if (!videoFile) throw new Error("Veo returned no video file reference");

  const tmpDir = path.join(os.tmpdir(), "scripted");
  fs.mkdirSync(tmpDir, { recursive: true });
  const fileName = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
  const localPath = path.join(tmpDir, fileName);

  console.log("[gemini] Downloading video to:", localPath);

  // SDK supports inline bytes for short clips
  if (videoFile.videoBytes) {
    fs.writeFileSync(localPath, Buffer.from(videoFile.videoBytes, "base64"));
    console.log("[gemini] Wrote inline video bytes, size:", fs.statSync(localPath).size);
    return { videoUrl: videoFile.uri ?? `file://${localPath}`, localPath };
  }

  if (!videoFile.uri) throw new Error("Veo video has no URI and no inline bytes");

  // Prefer SDK download (handles auth via configured API key)
  await withRetry(
    () => client.files.download({ file: videoFile.uri!, downloadPath: localPath }),
    { label: "video download" },
  );

  console.log("[gemini] Download complete, size:", fs.statSync(localPath).size, "bytes");
  return { videoUrl: videoFile.uri, localPath };
}

interface VeoCallOptions {
  prompt: string;
  model?: string;
  referenceImage?: { base64: string; mimeType: string };
  firstFrame?: { base64: string; mimeType: string };
  lastFrame?: { base64: string; mimeType: string };
  negativePrompt?: string;
  aspectRatio?: "16:9" | "9:16";
  durationSeconds?: number;
  resolution?: "720p" | "1080p";
  generateAudio?: boolean;
  enhancePrompt?: boolean;
  personGeneration?: PersonGeneration | string;
}

const DEFAULT_NEGATIVE_PROMPT = "low quality, blurry, distorted face, mangled hands, extra limbs, watermark, on-screen text, subtitles, captions, jittery motion, flicker, oversaturated, plastic skin, deformed mouth, lip-sync drift";

async function generateVeoVideo(options: VeoCallOptions): Promise<VideoClipResult> {
  // Pin one key for the entire start → poll → download lifecycle.
  // Operation IDs are scoped to the key that created them.
  const apiKey = nextApiKey();
  const client = clientFor(apiKey);
  const keyTail = apiKey.slice(-4);
  console.log(`[gemini] Veo job using key ...${keyTail} (pool size ${getApiKeyPool().length})`);

  const config: GenerateVideosConfig = {
    aspectRatio: options.aspectRatio ?? "16:9",
    numberOfVideos: 1,
    durationSeconds: options.durationSeconds ?? 8,
    resolution: options.resolution ?? "1080p",
  };

  // The following params are Vertex-AI-only on Veo 3.1 preview
  // (Gemini Developer API rejects with 400 INVALID_ARGUMENT):
  // personGeneration (allow_adult), generateAudio, enhancePrompt, negativePrompt.
  // Only set when explicitly passed.
  if (options.personGeneration !== undefined) config.personGeneration = options.personGeneration;
  if (options.generateAudio !== undefined) config.generateAudio = options.generateAudio;
  if (options.enhancePrompt !== undefined) config.enhancePrompt = options.enhancePrompt;
  if (options.negativePrompt !== undefined) config.negativePrompt = options.negativePrompt;

  let firstFrameImage: Image | undefined;
  if (options.firstFrame) {
    firstFrameImage = { imageBytes: options.firstFrame.base64, mimeType: options.firstFrame.mimeType };
  }
  if (options.lastFrame) {
    config.lastFrame = { imageBytes: options.lastFrame.base64, mimeType: options.lastFrame.mimeType };
  }
  if (options.referenceImage) {
    config.referenceImages = [{
      image: { imageBytes: options.referenceImage.base64, mimeType: options.referenceImage.mimeType },
      referenceType: VideoGenerationReferenceType.ASSET,
    }];
  }

  const model = options.model ??
    (options.firstFrame || options.lastFrame
      ? VEO_MODEL_INTERPOLATION
      : options.referenceImage
        ? VEO_MODEL_REFERENCE
        : VEO_MODEL_DEFAULT);

  await waitForVeoSlot(apiKey);

  let operation;
  try {
    operation = await withRetry(
      () => client.models.generateVideos({
        model,
        prompt: options.prompt,
        image: firstFrameImage,
        config,
      }),
      { label: "generateVideos start" },
    );
  } catch (err) {
    classifyVeoError(err);
  }

  console.log("[gemini] Veo operation created:", operation.name ?? "<no-name>");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    console.log("[gemini] Polling Veo operation... attempt", pollCount);
    await new Promise(resolve => setTimeout(resolve, 10_000));
    try {
      operation = await withRetry(
        () => client.operations.getVideosOperation({ operation }),
        { label: "poll videos op" },
      );
    } catch (err) {
      classifyVeoError(err);
    }
  }

  if (operation.error) {
    const errMsg = typeof operation.error === "string"
      ? operation.error
      : JSON.stringify(operation.error);
    if (errMsg.includes("429") || /\bquota\b/i.test(errMsg)) {
      throw new VeoQuotaExhaustedError(errMsg);
    }
    throw new Error(`Veo generation failed: ${errMsg}`);
  }

  const response = operation.response;
  const generated = response?.generatedVideos ?? [];

  if (generated.length === 0) {
    const reasons = response?.raiMediaFilteredReasons ?? [];
    if (reasons.length > 0 || (response?.raiMediaFilteredCount ?? 0) > 0) {
      throw new VeoRAIFilterError(reasons.length ? reasons : ["content filtered"]);
    }
    throw new Error(`Veo returned no video: ${JSON.stringify(response)}`);
  }

  const videoFile = generated[0]?.video;
  return downloadVideoFile(client, videoFile);
}

export async function generateVideoClip(
  prompt: string,
  referenceImageSource?: string,
): Promise<VideoClipResult> {
  console.log("[gemini] generateVideoClip called, prompt length:", prompt.length, "ref:", referenceImageSource ?? "<none>");
  const referenceImage = referenceImageSource
    ? (await loadReferenceImageBase64(referenceImageSource)) ?? undefined
    : undefined;
  if (referenceImageSource && !referenceImage) {
    console.warn("[gemini] Reference image requested but could not be loaded, proceeding without it:", referenceImageSource);
  }
  return generateVeoVideo({ prompt, referenceImage });
}

export async function generateVideoClipInterpolated(
  prompt: string,
  firstFramePath: string,
  lastFramePath: string,
): Promise<VideoClipResult> {
  console.log("[gemini] generateVideoClipInterpolated called, prompt length:", prompt.length);

  const firstFrame = {
    base64: fs.readFileSync(firstFramePath).toString("base64"),
    mimeType: "image/png",
  };
  const lastFrame = {
    base64: fs.readFileSync(lastFramePath).toString("base64"),
    mimeType: "image/png",
  };

  return generateVeoVideo({ prompt, firstFrame, lastFrame });
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Generation — Gemini
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateTextOptions {
  systemInstruction?: string;
  useGoogleSearch?: boolean;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  useGoogleSearch = false,
): Promise<string> {
  console.log("[gemini] generateText called, prompt length:", prompt.length);

  const client = getGenAIClient();

  const config: Record<string, unknown> = {};
  if (systemInstruction) config.systemInstruction = systemInstruction;
  if (useGoogleSearch) config.tools = [{ googleSearch: {} }];

  const result = await withRetry(
    () => client.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config,
    }),
    { label: "generateContent" },
  );

  const text = result.text;
  if (!text) {
    console.error("[gemini] Empty response from Gemini");
    throw new Error("Gemini returned empty response");
  }

  console.log("[gemini] Response received,", text.length, "chars");
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chat — multi-turn conversation with retries
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export async function generateChatReply(
  history: ChatTurn[],
  userMessage: string,
  systemInstruction: string,
): Promise<string> {
  const client = getGenAIClient();

  const chat = client.chats.create({
    model: TEXT_MODEL,
    config: { systemInstruction },
    history: history.map(turn => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
  });

  const response = await withRetry(
    () => chat.sendMessage({ message: userMessage }),
    { label: "chat.sendMessage" },
  );

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}
