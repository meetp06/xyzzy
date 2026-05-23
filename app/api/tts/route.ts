import { NextResponse } from "next/server";

import { generateTts } from "@/app/lib/tts";
import type { TtsHost } from "@/app/lib/tts";

interface TtsRequestBody {
  transcript: string;
  hosts: TtsHost[];
  targetLang?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TtsRequestBody;

    if (!body.transcript || typeof body.transcript !== "string") {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }
    if (!Array.isArray(body.hosts) || body.hosts.length === 0) {
      return NextResponse.json({ error: "hosts array is required" }, { status: 400 });
    }

    const wav = await generateTts(body.transcript, body.hosts, body.targetLang);

    return new Response(new Uint8Array(wav), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": wav.length.toString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS generation failed";
    console.error("[api/tts] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
