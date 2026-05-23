/* eslint-disable no-console */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { generateChatReply, generateText } = await import("../app/lib/gemini");

  console.log("── 1. generateText smoke test ──");
  const t0 = Date.now();
  const text = await generateText(
    "Reply in exactly one short sentence. What model are you?",
    "You are concise.",
  );
  console.log(`  reply (${Date.now() - t0}ms):`, text.trim());

  console.log("\n── 2. generateChatReply smoke test ──");
  const t1 = Date.now();
  const reply = await generateChatReply(
    [
      { role: "user", text: "My favorite color is purple." },
      { role: "model", text: "Got it." },
    ],
    "What is my favorite color?",
    "Be brief. Reply in under 10 words.",
  );
  console.log(`  reply (${Date.now() - t1}ms):`, reply.trim());

  console.log("\nPASS");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
