import { Buffer } from "node:buffer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { env } from "./env";

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter — Veo Video Generation
// ─────────────────────────────────────────────────────────────────────────────

const VEO_RPM = 2;
const VEO_WINDOW_MS = 60_000;
const veoCallTimestamps: number[] = [];

/** Reset rate limiter state — exported for tests only. */
export function _resetRateLimiter(): void {
  veoCallTimestamps.length = 0;
}

async function waitForVeoSlot(): Promise<void> {
  const now = Date.now();
  while (veoCallTimestamps.length > 0 && now - veoCallTimestamps[0] > VEO_WINDOW_MS) {
    veoCallTimestamps.shift();
  }

  if (veoCallTimestamps.length >= VEO_RPM) {
    const oldestInWindow = veoCallTimestamps[0];
    const waitMs = oldestInWindow + VEO_WINDOW_MS - now + 1_000;
    console.log(`[gemini] Rate limit: ${veoCallTimestamps.length}/${VEO_RPM} RPM used, waiting ${(waitMs / 1000).toFixed(0)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  veoCallTimestamps.push(Date.now());
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini Client
// ─────────────────────────────────────────────────────────────────────────────

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");
  return new GoogleGenerativeAI(apiKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Video Generation
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

/**
 * Thrown when video content is filtered by the content moderation system.
 */
export class VeoRAIFilterError extends Error {
  reasons: string[];
  constructor(reasons: string[]) {
    super(`Content filter: ${reasons.join("; ")}`);
    this.name = "VeoRAIFilterError";
    this.reasons = reasons;
  }
}

function loadReferenceImageBase64(slug: string): { base64: string; mimeType: string } | null {
  const baseDir = path.join(process.cwd(), "assets", "reference-images");
  const extensions = [".png", ".jpeg", ".jpg", ".webp"];

  for (const ext of extensions) {
    const candidate = path.join(baseDir, `${slug}${ext}`);
    if (fs.existsSync(candidate)) {
      const mimeType = ext === ".jpg" || ext === ".jpeg" ?
        "image/jpeg" :
        ext === ".webp" ?
          "image/webp" :
          "image/png";
      const base64 = fs.readFileSync(candidate).toString("base64");
      return { base64, mimeType };
    }
  }

  console.warn("[gemini] Reference image not found for slug:", slug);
  return null;
}

async function pollVeoOperation(operationName: string, apiKey: string): Promise<string> {
  let pollCount = 0;
  while (true) {
    pollCount++;
    console.log("[gemini] Polling Veo operation... attempt", pollCount);
    await new Promise(resolve => setTimeout(resolve, 10000));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`,
    );
    const data = await response.json();

    if (data.done) {
      if (data.error) {
        const errorMsg = data.error.message || JSON.stringify(data.error);
        // Check for quota exhaustion
        if (data.error.code === 429 || errorMsg.includes("quota")) {
          throw new VeoQuotaExhaustedError(errorMsg);
        }
        throw new Error(`Veo generation failed: ${errorMsg}`);
      }

      // Check for RAI filtering
      const videoUri = data.response?.generatedVideos?.[0]?.video?.uri ||
                       data.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!videoUri) {
        const filterReasons = data.response?.raiMediaFilteredReasons ||
          data.response?.generatedVideos?.[0]?.raiMediaFilteredReasons ||
          data.response?.generateVideoResponse?.raiMediaFilteredReasons ||
          data.response?.generateVideoResponse?.generatedSamples?.[0]?.raiMediaFilteredReasons ||
          [];
        if (filterReasons.length > 0) {
          throw new VeoRAIFilterError(filterReasons);
        }
        throw new Error(`Veo returned no video: ${JSON.stringify(data.response)}`);
      }

      return videoUri;
    }
  }
}

async function downloadVideo(videoUri: string, apiKey: string): Promise<VideoClipResult> {
  const tmpDir = path.join(os.tmpdir(), "interdimensional-cable");
  fs.mkdirSync(tmpDir, { recursive: true });
  const fileName = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
  const localPath = path.join(tmpDir, fileName);

  // The URI from Veo may need the API key appended
  let downloadUrl = videoUri;
  if (!downloadUrl.includes("key=")) {
    const separator = downloadUrl.includes("?") ? "&" : "?";
    downloadUrl = `${downloadUrl}${separator}key=${apiKey}`;
  }

  console.log("[gemini] Downloading video to:", localPath);
  const response = await fetch(downloadUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(localPath, Buffer.from(buffer));
  console.log("[gemini] Download complete, size:", fs.statSync(localPath).size, "bytes");

  return { videoUrl: downloadUrl, localPath };
}

export async function generateVideoClip(
  prompt: string,
  referenceImageSlug?: string,
): Promise<VideoClipResult> {
  console.log("[gemini] generateVideoClip called, prompt length:", prompt.length);
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");

  await waitForVeoSlot();

  const requestBody: any = {
    instances: [{
      prompt,
    }],
    parameters: {
      sampleCount: 1,
    },
  };

  // Add reference image if available
  if (referenceImageSlug) {
    const imageData = loadReferenceImageBase64(referenceImageSlug);
    if (imageData) {
      requestBody.instances[0].image = {
        bytesBase64Encoded: imageData.base64,
        mimeType: imageData.mimeType,
      };
    }
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 429) {
      throw new VeoQuotaExhaustedError(`Veo quota exhausted: ${JSON.stringify(data)}`);
    }
    throw new Error(`Failed to start Veo task: ${JSON.stringify(data)}`);
  }

  if (!data.name) {
    throw new Error(`No operation name returned: ${JSON.stringify(data)}`);
  }

  console.log("[gemini] Veo operation created:", data.name);
  const videoUri = await pollVeoOperation(data.name, apiKey);
  return downloadVideo(videoUri, apiKey);
}

export async function generateVideoClipInterpolated(
  prompt: string,
  firstFramePath: string,
  lastFramePath: string,
): Promise<VideoClipResult> {
  console.log("[gemini] generateVideoClipInterpolated called, prompt length:", prompt.length);
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");

  await waitForVeoSlot();

  // Read frame images
  const firstFrameBase64 = fs.readFileSync(firstFramePath).toString("base64");
  const lastFrameBase64 = fs.readFileSync(lastFramePath).toString("base64");

  const requestBody: any = {
    instances: [{
      prompt,
      image: {
        bytesBase64Encoded: firstFrameBase64,
        mimeType: "image/png",
      },
      lastFrame: {
        image: {
          bytesBase64Encoded: lastFrameBase64,
          mimeType: "image/png",
        },
      },
    }],
    parameters: {
      sampleCount: 1,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 429) {
      throw new VeoQuotaExhaustedError(`Veo quota exhausted: ${JSON.stringify(data)}`);
    }
    throw new Error(`Failed to start interpolation task: ${JSON.stringify(data)}`);
  }

  if (!data.name) {
    throw new Error(`No operation name returned: ${JSON.stringify(data)}`);
  }

  console.log("[gemini] Veo interpolation operation created:", data.name);
  const videoUri = await pollVeoOperation(data.name, apiKey);
  return downloadVideo(videoUri, apiKey);
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Generation — Gemini API via @google/generative-ai SDK
// ─────────────────────────────────────────────────────────────────────────────

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  _useGoogleSearch = false,
): Promise<string> {
  console.log("[gemini] generateText called, prompt length:", prompt.length);

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  if (!text) {
    console.error("[gemini] Empty response from Gemini");
    throw new Error("Gemini returned empty response");
  }

  console.log("[gemini] Response received,", text.length, "chars");
  return text;
}
