import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { env } from "./env";

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter — MiniMax Video Generation
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
    console.log(`[minimax] Rate limit: ${veoCallTimestamps.length}/${VEO_RPM} RPM used, waiting ${(waitMs / 1000).toFixed(0)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  veoCallTimestamps.push(Date.now());
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

async function uploadFileToMinimax(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
    : ext === ".webp" ? "image/webp"
    : "image/png";
  const imageBytes = fs.readFileSync(filePath).toString("base64");
  return `data:${mimeType};base64,${imageBytes}`;
}

function loadReferenceImagePath(slug: string): string | null {
  const baseDir = path.join(process.cwd(), "assets", "reference-images");
  const extensions = [".png", ".jpeg", ".jpg", ".webp"];

  for (const ext of extensions) {
    const candidate = path.join(baseDir, `${slug}${ext}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  console.warn("[minimax] Reference image not found for slug:", slug);
  return null;
}

async function pollVideoTask(taskId: string): Promise<string> {
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is required");

  let pollCount = 0;
  while (true) {
    pollCount++;
    console.log("[minimax] Polling for completion... attempt", pollCount);
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const response = await fetch(`https://api.minimax.io/v1/query_video_generation_task?task_id=${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });
    const data = await response.json();

    if (data.status === "success" || data.status === "Success" || data.state === 3) {
      const fileId = data.file_id;
      const fileResp = await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${fileId}`, {
         headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const fileData = await fileResp.json();
      if (fileData.file && fileData.file.download_url) {
        return fileData.file.download_url;
      }
      return data.file_id;
    } else if (data.status === "fail" || data.status === "Fail" || data.state === 4) {
      throw new Error(`Video generation failed: ${JSON.stringify(data)}`);
    }
  }
}

async function downloadVideo(urlOrFileId: string): Promise<VideoClipResult> {
  const tmpDir = path.join(os.tmpdir(), "interdimensional-cable");
  fs.mkdirSync(tmpDir, { recursive: true });
  const fileName = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
  const localPath = path.join(tmpDir, fileName);

  let downloadUrl = urlOrFileId;
  if (!urlOrFileId.startsWith("http")) {
      const apiKey = env.MINIMAX_API_KEY;
      const resp = await fetch(`https://api.minimax.io/v1/files/retrieve?file_id=${urlOrFileId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
      });
      const data = await resp.json();
      if (data.file && data.file.download_url) {
          downloadUrl = data.file.download_url;
      }
  }

  console.log("[minimax] Downloading video to:", localPath);
  const response = await fetch(downloadUrl);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(localPath, Buffer.from(buffer));
  console.log("[minimax] Download complete, size:", fs.statSync(localPath).size, "bytes");

  return { videoUrl: downloadUrl, localPath };
}

export async function generateVideoClip(
  prompt: string,
  referenceImageSlug?: string,
): Promise<VideoClipResult> {
  console.log("[minimax] generateVideoClip called, prompt length:", prompt.length);
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is required");

  await waitForVeoSlot();

  const payload: any = {
    model: "MiniMax-Hailuo-2.3",
    prompt
  };

  if (referenceImageSlug) {
    const imagePath = loadReferenceImagePath(referenceImageSlug);
    if (imagePath) {
      payload.first_frame_image = await uploadFileToMinimax(imagePath);
    }
  }

  const response = await fetch("https://api.minimax.io/v1/video_generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.task_id) {
    throw new Error(`Failed to start task: ${JSON.stringify(data)}`);
  }

  console.log("[minimax] Task created, ID:", data.task_id);
  const urlOrFileId = await pollVideoTask(data.task_id);
  return downloadVideo(urlOrFileId);
}

export async function generateVideoClipInterpolated(
  prompt: string,
  firstFramePath: string,
  lastFramePath: string,
): Promise<VideoClipResult> {
  console.log("[minimax] generateVideoClipInterpolated called, prompt length:", prompt.length);
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is required");

  await waitForVeoSlot();

  const payload: any = {
    model: "MiniMax-Hailuo-2.3",
    prompt,
    first_frame_image: await uploadFileToMinimax(firstFramePath),
    last_frame_image: await uploadFileToMinimax(lastFramePath)
  };

  const response = await fetch("https://api.minimax.io/v1/video_generation", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.task_id) {
    throw new Error(`Failed to start interpolation task: ${JSON.stringify(data)}`);
  }

  console.log("[minimax] Interpolation Task created, ID:", data.task_id);
  const urlOrFileId = await pollVideoTask(data.task_id);
  return downloadVideo(urlOrFileId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Generation — direct fetch to MiniMax chat/completions
// ─────────────────────────────────────────────────────────────────────────────

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  useGoogleSearch = false,
): Promise<string> {
  console.log("[minimax] generateText called, prompt length:", prompt.length);
  
  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is required");

  const messages: { role: string; content: string }[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const response = await fetch("https://api.minimax.io/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7",
      messages,
      temperature: 0.9,
      max_tokens: 8192,
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[minimax] API error:", JSON.stringify(data));
    throw new Error(`MiniMax API error: ${data.base_resp?.status_msg || JSON.stringify(data)}`);
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    console.error("[minimax] Empty response:", JSON.stringify(data));
    throw new Error("MiniMax returned empty response");
  }

  console.log("[minimax] Response received,", text.length, "chars");
  return text;
}
