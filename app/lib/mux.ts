import Mux from "@mux/mux-node";

import { env } from "./env";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Result of calling mux-node's asset retrieval helper. */
export type MuxAsset = Awaited<ReturnType<Mux["video"]["assets"]["retrieve"]>>;

/** Single track extracted from a Mux asset. */
export type AssetTrack = NonNullable<MuxAsset["tracks"]>[number];

/** Playback policy type for Mux assets. */
export type PlaybackPolicy = "public" | "signed";

/** Convenience bundle returned by `getPlaybackIdForAsset`. */
export interface PlaybackAsset {
  asset: MuxAsset;
  playbackId: string;
  policy: PlaybackPolicy;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mux Client (singleton)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared Mux client instance.
 * Returns null if credentials are not configured — Mux features will
 * throw at runtime with a helpful message instead of crashing at startup.
 */
function createMuxClient(): Mux | null {
  if (!env.MUX_TOKEN_ID || !env.MUX_TOKEN_SECRET || env.MUX_TOKEN_ID === "dummy") {
    console.warn("⚠ MUX_TOKEN_ID / MUX_TOKEN_SECRET not set (or dummy) — Mux features disabled. Videos will be served locally.");
    return null;
  }
  return new Mux({
    tokenId: env.MUX_TOKEN_ID,
    tokenSecret: env.MUX_TOKEN_SECRET,
  });
}

const _muxClient = createMuxClient();

/** Get the Mux client, throwing if not configured. */
export function getMux(): Mux {
  if (!_muxClient) {
    throw new Error("Mux credentials not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in .env.local");
  }
  return _muxClient;
}

/** Check if Mux is available (credentials configured). */
export function isMuxConfigured(): boolean {
  return _muxClient !== null;
}

export const mux = _muxClient as Mux; // Keep backward compat for imports

// ─────────────────────────────────────────────────────────────────────────────
// Asset Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lists Mux assets with optional pagination.
 *
 * @param options - Pagination options passed to Mux API
 * @returns List of assets
 */
export async function listAssets(
  options?: Parameters<typeof mux.video.assets.list>[0],
) {
  return mux.video.assets.list(options);
}

/**
 * Retrieves a single Mux asset by ID.
 *
 * @param assetId - The Mux asset ID
 * @returns The asset details
 */
export async function getAsset(assetId: string): Promise<MuxAsset> {
  return mux.video.assets.retrieve(assetId);
}

/**
 * Finds a usable playback ID for the given asset.
 * Prefers public playback IDs, falls back to signed if no public is available.
 *
 * @param asset - The Mux asset
 * @returns Object with playback ID and its policy
 * @throws Error if no public or signed playback ID is found
 */
function extractPlaybackId(asset: MuxAsset): { id: string; policy: PlaybackPolicy } {
  const playbackIds = asset.playback_ids || [];

  // Prefer public playback ID
  const publicPlaybackId = playbackIds.find(pid => pid.policy === "public");
  if (publicPlaybackId?.id) {
    return { id: publicPlaybackId.id, policy: "public" };
  }

  // Fall back to signed playback ID
  const signedPlaybackId = playbackIds.find(pid => pid.policy === "signed");
  if (signedPlaybackId?.id) {
    return { id: signedPlaybackId.id, policy: "signed" };
  }

  throw new Error(
    "No public or signed playback ID found for this asset. " +
    "A public or signed playback ID is required. DRM playback IDs are not currently supported.",
  );
}

/**
 * Retrieves an asset and its usable playback ID in one call.
 *
 * @param assetId - The Mux asset ID
 * @returns Asset, playback ID, and policy
 */
export async function getPlaybackIdForAsset(assetId: string): Promise<PlaybackAsset> {
  const asset = await mux.video.assets.retrieve(assetId);
  const { id: playbackId, policy } = extractPlaybackId(asset);

  return { asset, playbackId, policy };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed URL Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks if signing keys are configured.
 */
export function hasSigningKeys(): boolean {
  return Boolean(env.MUX_SIGNING_KEY && env.MUX_PRIVATE_KEY);
}

/**
 * Generates a signed JWT token for Mux playback URLs.
 * Requires MUX_SIGNING_KEY and MUX_PRIVATE_KEY to be configured.
 *
 * @param playbackId - The Mux playback ID
 * @param type - The type of token (video, thumbnail, etc.)
 * @returns The signed JWT token
 * @throws Error if signing keys are not configured
 */
export async function generatePlaybackToken(
  playbackId: string,
  type: "video" | "thumbnail" | "gif" | "storyboard" = "video",
): Promise<string> {
  if (!env.MUX_SIGNING_KEY || !env.MUX_PRIVATE_KEY) {
    throw new Error(
      "MUX_SIGNING_KEY and MUX_PRIVATE_KEY must be configured to generate signed playback URLs",
    );
  }

  return mux.jwt.signPlaybackId(playbackId, {
    keyId: env.MUX_SIGNING_KEY,
    keySecret: env.MUX_PRIVATE_KEY,
    type,
    expiration: "1d", // Default to 1 day
  });
}

/**
 * Generates a Mux static rendition URL for audio extraction, signed if necessary.
 *
 * IMPORTANT: Static renditions must be explicitly enabled on the Mux asset.
 * See: https://www.mux.com/docs/guides/enable-static-mp4-renditions
 *
 * The asset should have an audio-only static rendition enabled so this endpoint exists:
 * - `audio.m4a`
 *
 * For public playback IDs, returns unsigned URL.
 * For signed playback IDs, generates a signed URL with token.
 *
 * @param playbackId - The Mux playback ID
 * @param policy - The playback policy ("public" or "signed")
 * @param rendition - The static rendition file name to use (default: "audio.m4a")
 * @returns The static rendition URL (signed or unsigned)
 */
export async function getMuxAudioUrl(
  playbackId: string,
  policy: PlaybackPolicy,
  rendition: string = "audio.m4a",
): Promise<string> {
  // Use audio-only static rendition (recommended for Remotion audio analysis/rendering).
  // Note: Static renditions must be enabled on the asset for this to work
  const baseUrl = `https://stream.mux.com/${playbackId}/${rendition}`;

  if (policy === "public") {
    return baseUrl;
  }

  // Signed playback requires a token
  if (!hasSigningKeys()) {
    throw new Error(
      "Cannot generate signed audio URL: MUX_SIGNING_KEY and MUX_PRIVATE_KEY must be configured",
    );
  }

  const token = await generatePlaybackToken(playbackId, "video");
  return `${baseUrl}?token=${token}`;
}

/**
 * Generates a Mux instant clip URL for streaming a specific segment of a video.
 *
 * Uses Mux's instant clipping feature with `asset_start_time` and `asset_end_time`
 * query parameters. This is faster than rendering a static clip because it streams
 * the segment directly without any processing delay.
 *
 * See: https://www.mux.com/blog/instant-clipping-update
 *
 * @param playbackId - The Mux playback ID
 * @param policy - The playback policy ("public" or "signed")
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param format - Output format: "hls" for .m3u8, "audio" for audio-only .m4a
 * @returns The instant clip streaming URL
 */
export async function getMuxInstantClipUrl(
  playbackId: string,
  policy: PlaybackPolicy,
  startTime: number,
  endTime: number,
  format: "hls" | "audio" = "audio",
): Promise<string> {
  // Build the instant clip URL with time parameters
  const extension = format === "hls" ? ".m3u8" : "/audio.m4a";
  const baseUrl = `https://stream.mux.com/${playbackId}${extension}`;
  const params = new URLSearchParams({
    asset_start_time: startTime.toString(),
    asset_end_time: endTime.toString(),
  });

  if (policy === "public") {
    return `${baseUrl}?${params.toString()}`;
  }

  // Signed playback requires a token
  if (!hasSigningKeys()) {
    throw new Error(
      "Cannot generate signed instant clip URL: MUX_SIGNING_KEY and MUX_PRIVATE_KEY must be configured",
    );
  }

  const token = await generatePlaybackToken(playbackId, "video");
  params.set("token", token);
  return `${baseUrl}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Asset Upload Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new Mux asset from a video file URL.
 * The URL must be publicly accessible for Mux to ingest.
 *
 * @param videoUrl - Public URL to the video file
 * @returns The created Mux asset
 */
export async function createAssetFromUrl(videoUrl: string): Promise<MuxAsset> {
  const asset = await mux.video.assets.create({
    inputs: [{ url: videoUrl }],
    playback_policy: ["public"],
  });
  return asset;
}

/**
 * Creates a new Mux asset from a direct upload.
 * Returns the upload URL and asset ID.
 */
export async function createDirectUpload(): Promise<{
  uploadId: string;
  uploadUrl: string;
  assetId: string;
}> {
  const upload = await mux.video.uploads.create({
    cors_origin: "*",
    new_asset_settings: {
      playback_policy: ["public"],
    },
  });
  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
    assetId: upload.asset_id ?? "",
  };
}

/**
 * Polls a Mux direct upload until the asset_id is available.
 */
export async function waitForUploadAssetId(
  uploadId: string,
  timeoutMs: number = 2 * 60 * 1000,
): Promise<string> {
  const startedAt = Date.now();
  let delayMs = 1000;

  while (Date.now() - startedAt < timeoutMs) {
    const upload = await mux.video.uploads.retrieve(uploadId);
    if (upload.asset_id) {
      return upload.asset_id;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
    delayMs = Math.min(Math.round(delayMs * 1.5), 5000);
  }

  throw new Error(`Mux upload ${uploadId} did not produce an asset_id within ${timeoutMs / 1000}s`);
}

/**
 * Waits for a Mux asset to reach "ready" status.
 * Uses exponential backoff polling.
 *
 * @param assetId - The Mux asset ID to monitor
 * @param timeoutMs - Maximum wait time (default: 10 minutes)
 * @returns The ready asset
 */
export async function waitForAssetReady(
  assetId: string,
  timeoutMs: number = 10 * 60 * 1000,
): Promise<MuxAsset> {
  const startedAt = Date.now();
  let delayMs = 2000;

  while (Date.now() - startedAt < timeoutMs) {
    const asset = await mux.video.assets.retrieve(assetId);

    if (asset.status === "ready") {
      return asset;
    }

    if (asset.status === "errored") {
      throw new Error(`Mux asset ${assetId} errored during processing`);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
    delayMs = Math.min(Math.round(delayMs * 1.5), 15_000);
  }

  throw new Error(`Mux asset ${assetId} did not become ready within ${timeoutMs / 1000}s`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Track Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all ready audio tracks from an asset.
 *
 * @param asset - The Mux asset
 * @returns Array of ready audio tracks
 */
export function getReadyAudioTracks(asset: MuxAsset): AssetTrack[] {
  return (asset.tracks || []).filter(
    track => track.type === "audio" && track.status === "ready",
  );
}

/**
 * Finds an audio track for the given language code.
 *
 * @param asset - The Mux asset
 * @param languageCode - Optional ISO 639-1 language code (e.g., "es")
 * @returns The matching track, or undefined if not found
 */
export function findAudioTrack(
  asset: MuxAsset,
  languageCode?: string,
): AssetTrack | undefined {
  const tracks = getReadyAudioTracks(asset);
  if (!tracks.length) {
    return undefined;
  }

  if (!languageCode) {
    return tracks[0];
  }

  return tracks.find(track => track.language_code === languageCode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Track Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all ready text tracks from an asset.
 * Text tracks include subtitles, captions, and other text-based tracks.
 *
 * @param asset - The Mux asset
 * @returns Array of ready text tracks
 */
export function getReadyTextTracks(asset: MuxAsset): AssetTrack[] {
  return (asset.tracks || []).filter(
    track => track.type === "text" && track.status === "ready",
  );
}

/**
 * Finds a text track for the given language code.
 *
 * @param asset - The Mux asset
 * @param languageCode - Optional ISO 639-1 language code (e.g., "en")
 * @returns The matching track, or undefined if not found
 */
export function findTextTrack(
  asset: MuxAsset,
  languageCode?: string,
): AssetTrack | undefined {
  const tracks = getReadyTextTracks(asset);
  if (!tracks.length) {
    return undefined;
  }

  if (!languageCode) {
    return tracks[0];
  }

  return tracks.find(track => track.language_code === languageCode);
}

/**
 * Fetches the transcript content for a text track.
 * Uses the Mux Playback API to get the plain-text transcript.
 *
 * @param playbackId - The playback ID for the asset
 * @param trackId - The text track ID
 * @returns The transcript text
 */
export async function getTranscript(
  playbackId: string,
  trackId: string,
): Promise<string> {
  // Fetch transcript via direct URL (plain text without timing)
  const url = `https://stream.mux.com/${playbackId}/text/${trackId}.txt`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.status}`);
  }
  return response.text();
}

/**
 * Fetches the VTT content for a text track.
 * VTT files include timing information for each caption cue.
 *
 * @param playbackId - The playback ID for the asset
 * @param trackId - The text track ID
 * @returns The VTT content as a string
 */
export async function getTrackVtt(
  playbackId: string,
  trackId: string,
): Promise<string> {
  // Fetch VTT via direct URL
  const url = `https://stream.mux.com/${playbackId}/text/${trackId}.vtt`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch VTT: ${response.status}`);
  }
  return response.text();
}
