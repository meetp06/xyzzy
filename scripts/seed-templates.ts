/* eslint-disable no-console */
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../db/schema";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

const DEFAULT_TEMPLATES: schema.NewShowTemplate[] = [
  {
    name: "Last Week Tonight with John Oliver",
    showType: "monologue",
    referenceImageUrl: "/templates/john-oliver.png",
    hosts: [
      {
        name: "John Oliver",
        personality: "British comedian known for deep-dive investigative humor. Delivers long, passionate rants that build from absurd observations to genuine outrage. Uses elaborate analogies and metaphors that escalate to ridiculous extremes. Frequently addresses the camera directly with exasperated disbelief. Catchphrases include 'And now this...', 'Cool.', and 'Look...'. Combines righteous anger with self-deprecating humor. Often references obscure but fascinating details to make complex topics accessible. Pacing: starts measured, builds to incredulous crescendo.",
        position: "center",
      },
    ],
    notes: "HBO late-night format. Single host behind a desk. Heavy on research and investigative journalism wrapped in comedy. Signature move: the main story deep-dive with visual aids and dramatic reveals.",
    isDefault: true,
  },
  {
    name: "Late Night with Seth Meyers",
    showType: "monologue",
    referenceImageUrl: "/templates/seth-meyers.png",
    hosts: [
      {
        name: "Seth Meyers",
        personality: "Former SNL head writer with sharp, witty delivery. Known for his 'A Closer Look' segments that dissect political news with surgical precision. Dry, understated humor with occasional bursts of animated disbelief. Uses rhetorical questions and callback jokes effectively. Often pauses for effect after a punchline with a knowing smile. More cerebral and measured than other late-night hosts. Signature move: breaking character to laugh at his own absurd comparisons. Frequently uses the phrase 'Let me explain...' before diving into context.",
        position: "center",
      },
    ],
    notes: "NBC late-night format. Single host behind a desk. Known for 'A Closer Look' political comedy segments. More subdued set design, emphasis on writing quality over physical comedy.",
    isDefault: true,
  },
  {
    name: "SNL Weekend Update",
    showType: "conversation",
    referenceImageUrl: "/templates/snl-weekend-update.png",
    hosts: [
      {
        name: "Colin Jost",
        personality: "Clean-cut, preppy Harvard-educated writer. Delivers jokes with a polished, almost news-anchor sincerity that makes the punchlines land harder. Often the straight man to Michael Che's reactions. Tends toward wordplay and clever setups. Occasionally makes self-aware jokes about his own privileged background. Signature: maintaining composure while delivering increasingly absurd headlines, then breaking into a slight smirk.",
        position: "left",
      },
      {
        name: "Michael Che",
        personality: "Laid-back, conversational style with a sharp edge. Delivers jokes as if casually telling a friend, which makes the dark humor hit unexpectedly. Often reacts to his own jokes with suppressed laughter or mock disbelief. More willing to push boundaries and go for edgier material. Frequently ad-libs or adds commentary after the scripted joke. Known for making Colin uncomfortable with provocative observations. Signature: the knowing look to camera after a controversial punchline.",
        position: "right",
      },
    ],
    notes: "SNL news desk format. Two anchors sitting side by side behind a desk. They alternate delivering headlines with comedic commentary. Occasionally riff off each other or react to each other's jokes. The dynamic is key: Colin is the polished straight man, Michael Che is the loose cannon.",
    isDefault: true,
  },
];

async function seedTemplates() {
  console.log("Seeding default show templates...\n");

  for (const template of DEFAULT_TEMPLATES) {
    const existing = await db.query.showTemplates.findFirst({
      where: (t, { eq }) => eq(t.name, template.name),
    });

    if (existing) {
      console.log(`  ✓ "${template.name}" already exists, skipping`);
      continue;
    }

    await db.insert(schema.showTemplates).values(template);
    const hostCount = (template.hosts as Array<{ name: string }>).length;
    console.log(`  + "${template.name}" (${template.showType}, ${hostCount} host${hostCount > 1 ? "s" : ""})`);
  }

  console.log("\nDone! Templates seeded.\n");
}

seedTemplates()
  .catch((err) => {
    console.error("Failed to seed templates:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
