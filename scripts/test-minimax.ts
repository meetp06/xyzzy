/* eslint-disable no-console */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

function getApiKey(): string | undefined {
  return process.env.MINIMAX_API_KEY;
}

async function testApiKey(): Promise<boolean> {
  console.log("\n── Step 1/3: API Key ──────────────────────────────────");
  const key = getApiKey();
  if (!key) {
    console.log("  FAIL  No MINIMAX_API_KEY found in .env.local");
    return false;
  }
  console.log(`  PASS  Key found (${key.slice(0, 8)}...${key.slice(-4)})`);
  return true;
}

async function testMiniMaxText(): Promise<boolean> {
  console.log("\n── Step 2/3: MiniMax Text (MiniMax-M2.7) ─────────────────────");

  const start = Date.now();
  try {
    const response = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()!}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: [{ role: "user", content: "Reply with only the word PONG" }],
        max_tokens: 64,
      })
    });

    const data = await response.json();
    const elapsed = Date.now() - start;

    if (!response.ok) {
      console.log(`  FAIL  API error: ${JSON.stringify(data)} (${elapsed}ms)`);
      return false;
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) {
      console.log(`  PASS  Response: "${text}" (${elapsed}ms)`);
      return true;
    }
    console.log(`  FAIL  Empty response after ${elapsed}ms`);
    return false;
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${msg} (${elapsed}ms)`);
    return false;
  }
}

async function testMiniMaxTTS(): Promise<boolean> {
  console.log("\n── Step 3/3: MiniMax TTS (speech-2.8-hd) ───────────────────────");
  
  const start = Date.now();
  try {
    const response = await fetch("https://api.minimax.io/v1/t2a_v2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()!}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "speech-2.8-hd",
        text: "This is a TTS test.",
        stream: false,
        output_format: "url",
        voice_setting: {
          voice_id: "male-qn-qingse",
          speed: 1,
          vol: 1,
          pitch: 0
        }
      })
    });

    const data = await response.json();
    const elapsed = Date.now() - start;

    if (data.data?.audio || data.data?.audio_url || data.audio_url) {
      console.log(`  PASS  TTS generation request succeeded (${elapsed}ms)`);
      return true;
    }

    console.log(`  FAIL  API error or missing audio: ${JSON.stringify(data)} (${elapsed}ms)`);
    return false;
  } catch (err) {
    const elapsed = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  FAIL  ${msg} (${elapsed}ms)`);
    return false;
  }
}


async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║         MiniMax Connectivity Test                    ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const results: boolean[] = [];

  results.push(await testApiKey());
  if (!results[0]) {
    console.log("\n✗ Aborting — no API key configured.\n");
    process.exit(1);
  }

  results.push(await testMiniMaxText());
  results.push(await testMiniMaxTTS());

  console.log("\n── Summary ────────────────────────────────────────────");
  const labels = [
    "API Key",
    "MiniMax Text (MiniMax-M2.7)",
    "MiniMax TTS (speech-2.8-hd)",
  ];
  for (let i = 0; i < results.length; i++) {
    console.log(`  ${results[i] ? "PASS" : "FAIL"}  ${labels[i]}`);
  }

  const allPassed = results.every(Boolean);
  console.log(allPassed
    ? "\n✓ All checks passed — ready to generate shows.\n"
    : "\n✗ Some checks failed — see above for details.\n",
  );
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
