import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  env: {
    MINIMAX_API_KEY: "test-minimax-key",
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockAiGenerateText = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: any[]) => mockAiGenerateText(...args),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => {
    const provider = (modelId: string) => modelId;
    return provider;
  },
}));

describe("minimax", () => {
  beforeEach(async () => {
    mockFetch.mockReset();
    mockAiGenerateText.mockReset();
    const { _resetRateLimiter } = await import("./minimax");
    _resetRateLimiter();
  });

  describe("generateText", () => {
    it("calls MiniMax with correct model and returns text", async () => {
      mockAiGenerateText.mockResolvedValueOnce({
        text: "This is the research output.",
      });

      const { generateText } = await import("./minimax");
      const result = await generateText("Research AI", "You are a researcher");

      expect(mockAiGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "MiniMax-M2.7",
          prompt: "Research AI",
          system: "You are a researcher",
        }),
      );

      expect(result).toBe("This is the research output.");
    });

    it("throws on empty response", async () => {
      mockAiGenerateText.mockResolvedValueOnce({ text: "" });

      const { generateText } = await import("./minimax");
      await expect(generateText("test")).rejects.toThrow("MiniMax returned empty response");
    });
  });

  describe("generateVideoClip", () => {
    it("calls MiniMax Video Generation and polls", async () => {
      // POST task
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ task_id: "test-task" }),
      });

      // Polling GET status
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ status: "success", file_id: "fake_file_id" }),
      });

      // GET file info
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ file: { download_url: "https://minimax/download.mp4" } }),
      });

      // GET video content
      mockFetch.mockResolvedValueOnce({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });

      const { generateVideoClip } = await import("./minimax");
      
      // Use fake timers to advance polling timeout
      vi.useFakeTimers();
      const promise = generateVideoClip("A talk show host speaking");
      await vi.advanceTimersByTimeAsync(10001);
      vi.useRealTimers();

      const result = await promise;

      expect(mockFetch).toHaveBeenCalledWith("https://api.minimax.io/v1/video_generation", expect.anything());
      expect(result.videoUrl).toBe("https://minimax/download.mp4");
      expect(result.localPath).toContain("clip-");
    });
  });
});
