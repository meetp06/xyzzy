import { env } from "./env";
import { generateText } from "./minimax";

// ─────────────────────────────────────────────────────────────────────────────
// Voice mapping
// ─────────────────────────────────────────────────────────────────────────────

const VOICE_MAP: Record<string, string> = {
  "John Oliver": "male-qn-qingse",
  "Seth Meyers": "male-qn-jingying",
  "Colin Jost": "male-qn-qingse",
  "Michael Che": "male-qn-jingying",
};

const FALLBACK_VOICES = ["female-shaonv", "male-qn-qingse", "female-yujie", "male-qn-jingying"];

function voiceForHost(name: string, index: number): string {
  return VOICE_MAP[name] ?? FALLBACK_VOICES[index % FALLBACK_VOICES.length];
}

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
 * Generate speech audio from a transcript using MiniMax TTS.
 * Returns a WAV/MP3 buffer.
 */
export async function generateTts(
  transcript: string,
  hosts: TtsHost[],
  targetLang?: string,
): Promise<Buffer> {
  const langName = targetLang ? (LANGUAGE_NAMES[targetLang] ?? targetLang) : "English";
  console.log("[tts] generateTts called, transcript length:", transcript.length, "hosts:", hosts.map(h => h.name), "lang:", langName);

  const textToSpeak = targetLang
    ? await translateTranscript(transcript, langName)
    : transcript;

  const apiKey = env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY is required for TTS");

  const voiceId = hosts.length > 0 ? voiceForHost(hosts[0].name, 0) : FALLBACK_VOICES[0];

  console.log("[tts] Calling MiniMax TTS (speech-2.8-hd), voice:", voiceId);

  const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "speech-2.8-hd",
      text: textToSpeak,
      stream: false,
      output_format: "url",
      voice_setting: {
        voice_id: voiceId,
        speed: 1,
        vol: 1,
        pitch: 0
      }
    })
  });

  const data = await response.json();

  // output_format: "url" returns an audio URL in the response
  if (data.data?.audio) {
    // When output_format is "hex", audio is a hex-encoded string
    const buffer = Buffer.from(data.data.audio, "hex");
    console.log("[tts] Audio received from hex, size:", buffer.length);
    return buffer;
  } else if (data.data?.audio_url || data.audio_url) {
    const audioUrl = data.data?.audio_url || data.audio_url;
    console.log("[tts] Audio URL received, fetching...", audioUrl);
    const audioResp = await fetch(audioUrl);
    const arrayBuffer = await audioResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("[tts] Audio downloaded, size:", buffer.length);
    return buffer;
  }

  throw new Error(`MiniMax TTS returned unexpected format: ${JSON.stringify(data).slice(0, 500)}`);
}
