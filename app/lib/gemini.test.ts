import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-gemini-key");

const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("gemini", () => {
  describe("generateText", () => {
    beforeEach(() => {
      vi.resetModules();
      mockGenerateContent.mockReset();
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls Gemini with correct model and returns text", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => "Generated response text",
        },
      });

      const { generateText } = await import("./gemini");
      const result = await generateText("test prompt");
      expect(result).toBe("Generated response text");
      expect(mockGenerateContent).toHaveBeenCalledWith("test prompt");
    });

    it("throws on empty response", async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => "",
        },
      });

      const { generateText } = await import("./gemini");
      await expect(generateText("test")).rejects.toThrow("Gemini returned empty response");
    });
  });

  describe("generateVideoClip", () => {
    it("calls Veo API and polls for completion", async () => {
      // Mock the initial POST to create operation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ name: "operations/test-op-123" }),
      });

      // Mock the polling response (completed)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          done: true,
          response: {
            generatedVideos: [{
              video: { uri: "https://storage.googleapis.com/test-video.mp4" },
            }],
          },
        }),
      });

      // Mock the video download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      });

      const { generateVideoClip, _resetRateLimiter } = await import("./gemini");
      _resetRateLimiter();

      const result = await generateVideoClip("A test video prompt");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("veo-2:predictLongRunning"),
        expect.anything(),
      );
      expect(result.videoUrl).toContain("test-video.mp4");
    });
  });
});
