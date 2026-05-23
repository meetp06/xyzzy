import { Buffer } from "node:buffer";

import { env } from "./env";
import { generateText } from "./gemini";

// ─────────────────────────────────────────────────────────────────────────────
// Voice mapping — Google Cloud TTS voice IDs
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_MAP: Record<string, string> = {
  "John Oliver": "en-US-Studio-M",
  "Seth Meyers": "en-US-Studio-Q",
  "Colin Jost": "en-US-Studio-M",
  "Michael Che": "en-US-Studio-Q",
};

const FALLBACK_VOICES = ["en-US-Studio-O", "en-US-Studio-M", "en-US-Studio-Q", "en-US-Neural2-D"];

function voiceForHost(name: string, index: number): string {
  return VOICE_MAP[name] ?? FALLBACK_VOICES[index % FALLBACK_VOICES.length];
}

// Language code to Google TTS language code mapping
const LANG_TO_TTS_LANG: Record<string, string> = {
  es: "es-US",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
  ja: "ja-JP",
};

// ─────────────────────────────────────────────────────────────────────────────
// TTS generation
// ─────────────────────────────────────────────────────────────────────────────

export interface TtsHost {
  name: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ja: "Japanese",
};

/**
 * Translate text to a target language.
 */
async function translateTranscript(
  transcript: string,
  langName: string,
): Promise<string> {
  console.log("[tts] Translating transcript to", langName);

  const systemPrompt = `Translate the following talk show transcript to ${langName}. Return ONLY the translated text, preserving the speaker labels and structure. Do not add any commentary or notes.`;
  const translated = await generateText(transcript, systemPrompt);

  console.log("[tts] Translation complete, length:", translated.length);
  return translated;
}

/**
 * Generate speech audio from a transcript using Google Cloud TTS.
 * Returns a WAV/MP3 buffer.
 */
export async function generateTts(
  transcript: string,
  hosts: TtsHost[],
  targetLang?: string,
): Promise<Buffer> {
  const langName = targetLang ? (LANGUAGE_NAMES[targetLang] ?? targetLang) : "English";
  console.log("[tts] generateTts called, transcript length:", transcript.length, "hosts:", hosts.map(h => h.name), "lang:", langName);

  const textToSpeak = targetLang ?
      await translateTranscript(transcript, langName) :
    transcript;

  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey)
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required for TTS");

  const ttsLangCode = targetLang ? (LANG_TO_TTS_LANG[targetLang] ?? "en-US") : "en-US";
  const voiceName = hosts.length > 0 ? voiceForHost(hosts[0].name, 0) : FALLBACK_VOICES[0];

  // Adjust voice name for target language
  const finalVoiceName = targetLang ?
    `${ttsLangCode}-Studio-A` : // Use a generic studio voice for non-English
    voiceName;

  console.log("[tts] Calling Google Cloud TTS, voice:", finalVoiceName, "lang:", ttsLangCode);

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: textToSpeak },
        voice: {
          languageCode: ttsLangCode,
          name: finalVoiceName,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.0,
          pitch: 0,
        },
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("[tts] Google TTS error:", JSON.stringify(data));
    throw new Error(`Google TTS error: ${data.error?.message || JSON.stringify(data)}`);
  }

  if (data.audioContent) {
    const buffer = Buffer.from(data.audioContent, "base64");
    console.log("[tts] Audio received, size:", buffer.length);
    return buffer;
  }

  throw new Error(`Google TTS returned unexpected format: ${JSON.stringify(data).slice(0, 500)}`);
}
