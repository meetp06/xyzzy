import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupTempFiles, stitchClips } from "./stitch";

describe("stitch", () => {
  let tmpDir: string;
  const createdFiles: string[] = [];

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `stitch-test-${Date.now()}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTempFiles(createdFiles);
    createdFiles.length = 0;
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function createDummyFile(name: string, content = "dummy"): string {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content);
    createdFiles.push(filePath);
    return filePath;
  }

  it("throws when given empty array", async () => {
    await expect(stitchClips([])).rejects.toThrow("No clips to stitch");
  });

  it("copies single clip to output", async () => {
    const clip = createDummyFile("single.mp4", "video-data");
    const outputPath = path.join(tmpDir, "output.mp4");

    const result = await stitchClips([clip], outputPath);
    createdFiles.push(result);

    expect(result).toBe(outputPath);
    expect(fs.existsSync(result)).toBe(true);
    expect(fs.readFileSync(result, "utf-8")).toBe("video-data");
  });

  describe("cleanupTempFiles", () => {
    it("removes existing files", () => {
      const f1 = createDummyFile("a.mp4");
      const f2 = createDummyFile("b.mp4");
      expect(fs.existsSync(f1)).toBe(true);
      expect(fs.existsSync(f2)).toBe(true);

      cleanupTempFiles([f1, f2]);

      expect(fs.existsSync(f1)).toBe(false);
      expect(fs.existsSync(f2)).toBe(false);
    });

    it("ignores non-existent files", () => {
      expect(() => cleanupTempFiles(["/nonexistent/file.mp4"])).not.toThrow();
    });
  });
});
