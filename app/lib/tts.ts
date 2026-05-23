import { Buffer } from "node:buffer";

import { Modality } from "@google/genai";

import { env } from "./env";
import { generateText, getGenAIClient, withRetry } from "./gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Voice mapping — Gemini TTS prebuilt voice names
// (Charon = deep male, Puck = lighter male, Kore = female, Aoede = female,
//  Fenrir = gravelly male, Leda = bright female, Orus = warm male, Zephyr = soft)
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_MAP: Record<string, string> = {
  "John Oliver": "Charon",
  "Seth Meyers": "Puck",
  "Colin Jost": "Orus",
  "Michael Che": "Fenrir",
};

const FALLBACK_VOICES = ["Charon", "Puck", "Kore", "Aoede"];

function voiceForHost(name: string, index: number): string {
  return VOICE_MAP[name] ?? FALLBACK_VOICES[index % FALLBACK_VOICES.length];
}

const LANG_TO_BCP47: Record<string, string> = {
  es: "es-US",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  ja: "ja-JP",
};

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ja: "Japanese",
};

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const PCM_SAMPLE_RATE = 24000;
const PCM_BITS_PER_SAMPLE = 16;
const PCM_CHANNELS = 1;

// ─────────────────────────────────────────────────────────────────────────────
// PCM → WAV wrapper (Gemini TTS returns raw 16-bit PCM mono @ 24kHz)
// ─────────────────────────────────────────────────────────────────────────────

function pcmToWav(pcm: Buffer): Buffer {
  const byteRate = (PCM_SAMPLE_RATE * PCM_CHANNELS * PCM_BITS_PER_SAMPLE) / 8;
  const blockAlign = (PCM_CHANNELS * PCM_BITS_PER_SAMPLE) / 8;
  const dataSize = pcm.length;
  const fileSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(fileSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(PCM_CHANNELS, 22);
  header.writeUInt32LE(PCM_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(PCM_BITS_PER_SAMPLE, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS generation
// ─────────────────────────────────────────────────────────────────────────────

export interface TtsHost {
  name: string;
}

async function translateTranscript(transcript: string, langName: string): Promise<string> {
  console.log("[tts] Translating transcript to", langName);
  const systemPrompt = `Translate the following talk show transcript to ${langName}. Return ONLY the translated text, preserving the speaker labels and structure. Do not add any commentary or notes.`;
  const translated = await generateText(transcript, systemPrompt);
  console.log("[tts] Translation complete, length:", translated.length);
  return translated;
}

/**
 * Generate speech audio from a transcript using Gemini native TTS.
 * Returns a WAV buffer (16-bit PCM mono @ 24kHz with WAV header).
 */
export async function generateTts(
  transcript: string,
  hosts: TtsHost[],
  targetLang?: string,
): Promise<Buffer> {
  const langName = targetLang ? (LANGUAGE_NAMES[targetLang] ?? targetLang) : "English";
  console.log("[tts] generateTts called, transcript length:", transcript.length, "hosts:", hosts.map(h => h.name), "lang:", langName);

  if (!env.GOOGLE_GENERATIVE_AI_API_KEY)
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for TTS");

  const textToSpeak = targetLang
    ? await translateTranscript(transcript, langName)
    : transcript;

  const voiceName = hosts.length > 0 ? voiceForHost(hosts[0].name, 0) : FALLBACK_VOICES[0];
  const languageCode = targetLang ? (LANG_TO_BCP47[targetLang] ?? "en-US") : "en-US";

  console.log("[tts] Calling Gemini TTS, voice:", voiceName, "lang:", languageCode);

  const client = getGenAIClient();

  const result = await withRetry(
    () => client.models.generateContent({
      model: TTS_MODEL,
      contents: textToSpeak,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          languageCode,
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    }),
    { label: "tts.generateContent" },
  );

  const part = result.candidates?.[0]?.content?.parts?.[0];
  const audioBase64 = part?.inlineData?.data;
  if (!audioBase64) {
    throw new Error(`Gemini TTS returned no audio: ${JSON.stringify(result).slice(0, 500)}`);
  }

  const pcm = Buffer.from(audioBase64, "base64");
  const wav = pcmToWav(pcm);
  console.log("[tts] Audio received, PCM:", pcm.length, "WAV:", wav.length);
  return wav;
}
