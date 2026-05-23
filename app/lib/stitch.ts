import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Concatenates video clips into a single output file using ffmpeg.
 * Uses the concat demuxer for fast, lossless concatenation when codecs match.
 *
 * @param clipPaths - Array of local file paths to video clips, in order
 * @param outputPath - Optional output path. Defaults to a temp file.
 * @returns Path to the stitched output video
 */
export async function stitchClips(
  clipPaths: string[],
  outputPath?: string,
): Promise<string> {
  console.log("[stitch] stitchClips called with", clipPaths.length, "clips");
  if (clipPaths.length === 0) {
    throw new Error("No clips to stitch");
  }

  // Single clip — just copy it
  if (clipPaths.length === 1) {
    const dest = outputPath ?? generateOutputPath();
    fs.copyFileSync(clipPaths[0], dest);
    return dest;
  }

  const tmpDir = path.join(os.tmpdir(), "interdimensional-cable");
  fs.mkdirSync(tmpDir, { recursive: true });

  // Write concat list file
  const listPath = path.join(tmpDir, `concat-${Date.now()}.txt`);
  const listContent = clipPaths
    .map(p => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listPath, listContent);

  const output = outputPath ?? generateOutputPath();

  try {
    // First try lossless concat (fast, works when codecs match)
    console.log("[stitch] Attempting lossless concat to:", output);
    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      output,
    ], { timeout: 120_000 });
  } catch (concatErr) {
    // Fallback: re-encode if codecs don't match
    console.warn("[stitch] Lossless concat failed, falling back to re-encode:", concatErr);
    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c:v", "libx264",
      "-preset", "fast",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "128k",
      output,
    ], { timeout: 300_000 });
  }

  // Clean up list file
  try {
    fs.unlinkSync(listPath);
  } catch {
    // ignore
  }

  return output;
}

function generateOutputPath(): string {
  const tmpDir = path.join(os.tmpdir(), "interdimensional-cable");
  fs.mkdirSync(tmpDir, { recursive: true });
  return path.join(tmpDir, `stitched-${Date.now()}.mp4`);
}

/**
 * Extracts a single frame from a video at the given timestamp using FFmpeg.
 *
 * @param videoPath - Path to the source video
 * @param timeSeconds - Timestamp in seconds to extract the frame from
 * @returns Path to the extracted PNG frame
 */
export async function extractFrame(
  videoPath: string,
  timeSeconds: number,
): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), "interdimensional-cable");
  fs.mkdirSync(tmpDir, { recursive: true });

  const outputPath = path.join(tmpDir, `frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`);

  console.log("[stitch] Extracting frame at", timeSeconds, "s from:", videoPath);
  await execFileAsync("ffmpeg", [
    "-y",
    "-ss", String(timeSeconds),
    "-i", videoPath,
    "-frames:v", "1",
    "-f", "image2",
    outputPath,
  ], { timeout: 30_000 });

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Frame extraction failed — output not found: ${outputPath}`);
  }

  console.log("[stitch] Frame extracted:", outputPath, `(${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB)`);
  return outputPath;
}

/**
 * Cleans up temporary video files.
 */
export function cleanupTempFiles(paths: string[]): void {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

/**
 * Overlays an audio file onto a video using ffmpeg.
 * If the video already has audio, the existing audio is replaced.
 * Useful for merging TTS audio with silent video clips from open-source models.
 *
 * @param videoPath - Path to the input video file
 * @param audioPath - Path to the audio file (WAV, MP3, etc.)
 * @param outputPath - Optional output path. Defaults to a temp file.
 * @returns Path to the merged output video
 */
export async function overlayAudio(
  videoPath: string,
  audioPath: string,
  outputPath?: string,
): Promise<string> {
  console.log("[stitch] overlayAudio called — video:", videoPath, "audio:", audioPath);
  const output = outputPath ?? generateOutputPath();

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", videoPath,
      "-i", audioPath,
      "-c:v", "copy",          // keep video codec as-is
      "-c:a", "aac",           // encode audio to AAC
      "-b:a", "192k",
      "-map", "0:v:0",         // take video from first input
      "-map", "1:a:0",         // take audio from second input
      "-shortest",             // truncate to shorter stream
      output,
    ], { timeout: 120_000 });
  } catch (err) {
    console.error("[stitch] overlayAudio failed:", err);
    // If overlay fails, just copy the video without audio
    fs.copyFileSync(videoPath, output);
    console.warn("[stitch] Falling back to video-only (no audio overlay)");
  }

  console.log("[stitch] overlayAudio output:", output, `(${(fs.statSync(output).size / 1024).toFixed(0)} KB)`);
  return output;
}
