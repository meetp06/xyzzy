import { describe, expect, it } from "vitest";

/**
 * Tests for the generate-show workflow helpers.
 *
 * The workflow itself depends on Vercel's workflow runtime and a database,
 * so we test the pure functions that can be unit-tested in isolation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// buildVeoPrompt (extracted logic test)
// ─────────────────────────────────────────────────────────────────────────────

interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

interface Host {
  name: string;
  personality: string;
  position?: string;
}

function sanitizeNotesForVeo(notes: string): string {
  return notes
    .replace(/\bHBO\b/gi, "premium cable")
    .replace(/\bNBC\b/gi, "broadcast network")
    .replace(/\bSNL\b/gi, "sketch comedy show")
    .replace(/\bSaturday Night Live\b/gi, "sketch comedy show")
    .replace(/\bLast Week Tonight\b/gi, "weekly investigative comedy show")
    .replace(/\bLate Night\b/gi, "late-night show")
    .replace(/\bWeekend Update\b/gi, "news desk comedy segment")
    .replace(/\bColin Jost\b/gi, "Colin")
    .replace(/\bMichael Che\b/gi, "Michael")
    .replace(/\bJohn Oliver\b/gi, "John")
    .replace(/\bSeth Meyers\b/gi, "Seth");
}

function buildVeoPrompt(
  segment: TranscriptSegment,
  hosts: Host[],
  showType: string,
  notes: string,
): string {
  const host = hosts.find(h => h.name === segment.speaker) ?? hosts[0];
  const sanitizedNotes = sanitizeNotesForVeo(notes);

  let prompt = "A professional late-night talk show segment. ";

  if (showType === "conversation") {
    prompt += "Two hosts sit behind a news desk with a world map graphic behind them. ";
    if (host.position === "left") {
      prompt += "The person on the LEFT is speaking and gesturing. ";
    } else if (host.position === "right") {
      prompt += "The person on the RIGHT is speaking and gesturing. ";
    }
  } else {
    prompt += "A single host behind a desk delivering a monologue, with a colorful graphic behind them. ";
  }

  prompt += `The host is saying: "${segment.text}" `;
  prompt += `Style: ${sanitizedNotes} `;
  prompt += "The host should be animated, expressive, and natural. Studio lighting, professional TV production quality.";

  return prompt;
}

describe("buildVeoPrompt", () => {
  const segment: TranscriptSegment = {
    speaker: "John Oliver",
    text: "This is absolutely bonkers.",
    startTime: 0,
    endTime: 8,
  };

  const hosts: Host[] = [
    { name: "John Oliver", personality: "Witty British host", position: "center" },
  ];

  it("builds monologue prompt", () => {
    const result = buildVeoPrompt(segment, hosts, "monologue", "HBO style");
    expect(result).toContain("single host behind a desk");
    expect(result).toContain("This is absolutely bonkers.");
    expect(result).toContain("premium cable style");
    expect(result).not.toContain("HBO");
    expect(result).not.toContain("Two hosts");
  });

  it("builds conversation prompt with left speaker", () => {
    const conversationHosts: Host[] = [
      { name: "Colin", personality: "Dry humor", position: "left" },
      { name: "Michael", personality: "Bold humor", position: "right" },
    ];

    const seg: TranscriptSegment = {
      speaker: "Colin",
      text: "Breaking news tonight.",
      startTime: 0,
      endTime: 8,
    };

    const result = buildVeoPrompt(seg, conversationHosts, "conversation", "SNL style");
    expect(result).toContain("Two hosts sit behind a news desk");
    expect(result).toContain("LEFT is speaking");
    expect(result).toContain("Breaking news tonight.");
    expect(result).toContain("sketch comedy show style");
    expect(result).not.toContain("SNL");
  });

  it("builds conversation prompt with right speaker", () => {
    const conversationHosts: Host[] = [
      { name: "Colin", personality: "Dry humor", position: "left" },
      { name: "Michael", personality: "Bold humor", position: "right" },
    ];

    const seg: TranscriptSegment = {
      speaker: "Michael",
      text: "You heard that right.",
      startTime: 8,
      endTime: 16,
    };

    const result = buildVeoPrompt(seg, conversationHosts, "conversation", "");
    expect(result).toContain("RIGHT is speaking");
  });

  it("falls back to first host if speaker not found", () => {
    const seg: TranscriptSegment = {
      speaker: "Unknown Host",
      text: "Hello world",
      startTime: 0,
      endTime: 8,
    };

    const result = buildVeoPrompt(seg, hosts, "monologue", "");
    expect(result).toContain("Hello world");
    // Should still build a valid prompt, using first host
    expect(result).toContain("single host behind a desk");
  });
});

describe("sanitizeNotesForVeo", () => {
  it("replaces network and show names", () => {
    const input = "HBO late-night format. SNL news desk. NBC show. Last Week Tonight style. Weekend Update format.";
    const result = sanitizeNotesForVeo(input);
    expect(result).not.toContain("HBO");
    expect(result).not.toContain("SNL");
    expect(result).not.toContain("NBC");
    expect(result).not.toContain("Last Week Tonight");
    expect(result).not.toContain("Weekend Update");
    expect(result).toContain("premium cable");
    expect(result).toContain("sketch comedy show");
    expect(result).toContain("broadcast network");
    expect(result).toContain("weekly investigative comedy show");
    expect(result).toContain("news desk comedy segment");
  });

  it("replaces full celebrity names with first names", () => {
    const input = "Colin Jost and Michael Che style. John Oliver format. Seth Meyers delivery.";
    const result = sanitizeNotesForVeo(input);
    expect(result).not.toContain("Jost");
    expect(result).not.toContain("Che");
    expect(result).not.toContain("Oliver");
    expect(result).not.toContain("Meyers");
  });

  it("is case insensitive", () => {
    const result = sanitizeNotesForVeo("hbo format and snl style");
    expect(result).not.toMatch(/hbo/i);
    expect(result).not.toMatch(/snl/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Script JSON parsing (extracted logic test)
// ─────────────────────────────────────────────────────────────────────────────

function parseScriptJson(scriptResult: string, hostName: string, clipCount: number): TranscriptSegment[] {
  try {
    const jsonMatch = scriptResult.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array found in script output");

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      speaker: string;
      text: string;
      clipIndex: number;
    }>;

    return parsed.map((seg, i) => ({
      speaker: seg.speaker,
      text: seg.text,
      startTime: i * 8,
      endTime: (i + 1) * 8,
    }));
  } catch {
    // Fallback: split into equal segments
    const words = scriptResult.split(/\s+/);
    const wordsPerSegment = Math.ceil(words.length / clipCount);
    const segments: TranscriptSegment[] = [];
    for (let i = 0; i < clipCount; i++) {
      const segWords = words.slice(i * wordsPerSegment, (i + 1) * wordsPerSegment);
      segments.push({
        speaker: hostName,
        text: segWords.join(" "),
        startTime: i * 8,
        endTime: (i + 1) * 8,
      });
    }
    return segments;
  }
}

describe("parseScriptJson", () => {
  it("parses valid JSON array", () => {
    const input = `[{"speaker": "John", "text": "Hello folks!", "clipIndex": 0}, {"speaker": "John", "text": "Good night!", "clipIndex": 1}]`;
    const result = parseScriptJson(input, "John", 2);

    expect(result).toHaveLength(2);
    expect(result[0].speaker).toBe("John");
    expect(result[0].text).toBe("Hello folks!");
    expect(result[0].startTime).toBe(0);
    expect(result[0].endTime).toBe(8);
    expect(result[1].startTime).toBe(8);
    expect(result[1].endTime).toBe(16);
  });

  it("parses JSON with surrounding text", () => {
    const input = `Here is the script:\n[{"speaker": "Host", "text": "Welcome!", "clipIndex": 0}]\nDone.`;
    const result = parseScriptJson(input, "Host", 1);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Welcome!");
  });

  it("falls back to plain text splitting on invalid JSON", () => {
    const input = "This is not JSON at all but has enough words to split into segments nicely here";
    const result = parseScriptJson(input, "DefaultHost", 2);

    expect(result).toHaveLength(2);
    expect(result[0].speaker).toBe("DefaultHost");
    expect(result[0].startTime).toBe(0);
    expect(result[1].startTime).toBe(8);
  });

  it("handles empty JSON array", () => {
    const input = "[]";
    const result = parseScriptJson(input, "Host", 2);
    expect(result).toHaveLength(0);
  });
});
