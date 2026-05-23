/* eslint-disable no-console */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });

const VEO_MODEL = "veo-3.1-generate-preview";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("No GEMINI_API_KEY found in .env.local");
  return key;
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║     Reference Image (JPEG) Test                     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Step 1: Check all reference images load
  console.log("── Step 1: Load reference images ──────────────────────\n");
  const baseDir = path.join(process.cwd(), "assets", "reference-images");
  const slugs = ["john-oliver", "seth-meyers", "snl-weekend-update"];
  const extensions = [".png", ".jpeg", ".jpg", ".webp"];

  for (const slug of slugs) {
    let found = false;
    for (const ext of extensions) {
      const filePath = path.join(baseDir, `${slug}${ext}`);
      if (fs.existsSync(filePath)) {
        const size = (fs.statSync(filePath).size / 1024).toFixed(0);
        console.log(`  PASS  ${slug}${ext} (${size} KB)`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`  FAIL  ${slug} — no image found`);
    }
  }

  // Step 2: Test Veo with JPEG reference image
  console.log("\n── Step 2: Veo + JPEG reference image ─────────────────\n");
  const { GoogleGenAI, VideoGenerationReferenceType } = await import("@google/genai");
  const client = new GoogleGenAI({ apiKey: getApiKey() });

  // Use john-oliver.jpeg as test
  const imagePath = path.join(baseDir, "john-oliver.jpeg");
  if (!fs.existsSync(imagePath)) {
    console.log("  FAIL  john-oliver.jpeg not found, cannot test");
    process.exit(1);
  }

  const imageBytes = fs.readFileSync(imagePath).toString("base64");
  console.log(`  ...  Loaded john-oliver.jpeg (${(imageBytes.length * 0.75 / 1024).toFixed(0)} KB)`);
  console.log("  ...  Sending to Veo with referenceImages + personGeneration: allow_adult...");

  const start = Date.now();
  try {
    let operation = await client.models.generateVideos({
      model: VEO_MODEL,
      prompt: "A professional late-night talk show segment. A single host behind a desk delivering a monologue, with a colorful graphic behind them. The host is saying: \"Welcome back everyone, tonight we have an absolutely wild story for you.\" The host should be animated, expressive, and natural. Studio lighting, professional TV production quality.",
      config: {
        aspectRatio: "16:9",
        numberOfVideos: 1,
        durationSeconds: 8,
        resolution: "1080p",
        personGeneration: "allow_adult",
        referenceImages: [{
          image: { imageBytes, mimeType: "image/jpeg" },
          referenceType: VideoGenerationReferenceType.ASSET,
        }],
      },
    });

    const elapsed = Date.now() - start;
    if (operation.error) {
      console.log(`  FAIL  API error: ${JSON.stringify(operation.error)} (${elapsed}ms)`);
      process.exit(1);
    }

    console.log(`  PASS  Request accepted (${elapsed}ms)`);
    console.log("  ...  Polling for completion...");

    let pollCount = 0;
    while (!operation.done) {
      pollCount++;
      const pollElapsed = Date.now() - start;
      console.log(`  ...  Poll #${pollCount} (${Math.round(pollElapsed / 1000)}s elapsed)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await client.operations.getVideosOperation({ operation });
    }

    const totalElapsed = Date.now() - start;
    if (operation.error) {
      console.log(`  FAIL  Generation error: ${JSON.stringify(operation.error)} (${totalElapsed}ms)`);
      process.exit(1);
    }

    const videoCount = operation.response?.generatedVideos?.length ?? 0;
    const filtered = operation.response?.raiMediaFilteredCount ?? 0;
    const filterReasons = operation.response?.raiMediaFilteredReasons ?? [];

    if (filtered > 0) {
      console.log(`  WARN  ${filtered} video(s) filtered by RAI policy: ${filterReasons.join(", ")}`);
    }

    if (videoCount > 0) {
      console.log(`  PASS  Video generated with JPEG reference image! (${videoCount} video(s), ${Math.round(totalElapsed / 1000)}s)`);
    } else {
      console.log(`  FAIL  No videos returned (filtered: ${filtered}) (${Math.round(totalElapsed / 1000)}s)`);
    }
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);

    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      console.log(`  FAIL  Rate limited — wait 60s and try again (${elapsed}ms)`);
    } else {
      console.log(`  FAIL  ${msg} (${elapsed}ms)`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
