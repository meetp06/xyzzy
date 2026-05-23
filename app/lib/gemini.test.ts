import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-gemini-key");

const mockGenerateContent = vi.fn();
const mockGenerateVideos = vi.fn();
const mockGetVideosOperation = vi.fn();
const mockFilesDownload = vi.fn();
const mockSendMessage = vi.fn();
const mockChatsCreate = vi.fn();

vi.mock("@google/genai", () => {
  class GoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
      generateVideos: mockGenerateVideos,
    };

    operations = {
      getVideosOperation: mockGetVideosOperation,
    };

    files = {
      download: mockFilesDownload,
    };

    chats = {
      create: mockChatsCreate,
    };
  }

  return {
    GoogleGenAI,
    PersonGeneration: { ALLOW_ADULT: "ALLOW_ADULT" },
    VideoGenerationReferenceType: { ASSET: "ASSET", STYLE: "STYLE" },
  };
});

describe("gemini", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGenerateContent.mockReset();
    mockGenerateVideos.mockReset();
    mockGetVideosOperation.mockReset();
    mockFilesDownload.mockReset();
    mockSendMessage.mockReset();
    mockChatsCreate.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateText", () => {
    it("calls Gemini with correct model and returns text", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: "Generated response text" });

      const { generateText } = await import("./gemini");
      const result = await generateText("test prompt");

      expect(result).toBe("Generated response text");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3.5-flash",
          contents: "test prompt",
        }),
      );
    });

    it("throws on empty response", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: "" });

      const { generateText } = await import("./gemini");
      await expect(generateText("test")).rejects.toThrow("Gemini returned empty response");
    });

    it("attaches systemInstruction when provided", async () => {
      mockGenerateContent.mockResolvedValueOnce({ text: "ok" });

      const { generateText } = await import("./gemini");
      await generateText("hi", "be terse");

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ systemInstruction: "be terse" }),
        }),
      );
    });
  });

  describe("generateVideoClip", () => {
    it("starts a Veo op and downloads the video when op completes immediately", async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        name: "operations/test-op-123",
        done: true,
        response: {
          generatedVideos: [{ video: { uri: "https://generativelanguage.googleapis.com/v1beta/files/test:download" } }],
        },
      });

      mockFilesDownload.mockImplementationOnce(async ({ downloadPath }: { downloadPath: string }) => {
        const fs = await import("node:fs");
        fs.writeFileSync(downloadPath, Buffer.from("fake-video-bytes"));
      });

      const { generateVideoClip, _resetRateLimiter } = await import("./gemini");
      _resetRateLimiter();

      const result = await generateVideoClip("A test video prompt");

      expect(mockGenerateVideos).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "veo-3.1-generate-preview",
          prompt: "A test video prompt",
        }),
      );
      expect(result.videoUrl).toContain("test:download");
      expect(result.localPath).toMatch(/clip-.*\.mp4$/);
    });

    it("throws VeoRAIFilterError when response is filtered", async () => {
      mockGenerateVideos.mockResolvedValueOnce({
        name: "operations/filtered",
        done: true,
        response: {
          generatedVideos: [],
          raiMediaFilteredCount: 1,
          raiMediaFilteredReasons: ["unsafe"],
        },
      });

      const { generateVideoClip, _resetRateLimiter, VeoRAIFilterError } = await import("./gemini");
      _resetRateLimiter();

      await expect(generateVideoClip("filtered prompt")).rejects.toBeInstanceOf(VeoRAIFilterError);
    });
  });

  describe("generateChatReply", () => {
    it("creates a chat session and sends the message", async () => {
      mockSendMessage.mockResolvedValueOnce({ text: "chat reply" });
      mockChatsCreate.mockReturnValueOnce({ sendMessage: mockSendMessage });

      const { generateChatReply } = await import("./gemini");
      const reply = await generateChatReply(
        [{ role: "user", text: "hello" }, { role: "model", text: "hi" }],
        "how are you?",
        "be helpful",
      );

      expect(reply).toBe("chat reply");
      expect(mockChatsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3.5-flash",
          config: { systemInstruction: "be helpful" },
          history: [
            { role: "user", parts: [{ text: "hello" }] },
            { role: "model", parts: [{ text: "hi" }] },
          ],
        }),
      );
      expect(mockSendMessage).toHaveBeenCalledWith({ message: "how are you?" });
    });
  });

  describe("withRetry", () => {
    it("retries transient fetch failures and eventually succeeds", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fetch failed"))
        .mockResolvedValueOnce("ok");

      const { withRetry } = await import("./gemini");
      const result = await withRetry(fn, { baseDelayMs: 1, label: "test" });

      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("does not retry non-retriable errors", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("invalid request"));

      const { withRetry } = await import("./gemini");
      await expect(withRetry(fn, { baseDelayMs: 1 })).rejects.toThrow("invalid request");
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
