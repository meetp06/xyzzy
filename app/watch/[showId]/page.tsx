import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { notFound, redirect } from "next/navigation";
import { Pool } from "pg";

import { Header } from "@/app/components/header";
import { env } from "@/app/lib/env";
import * as schema from "@/db/schema";

import { WatchContent } from "./watch-content";

export const dynamic = "force-dynamic";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

export default async function WatchPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;

  const show = await db.query.generatedShows.findFirst({
    where: eq(schema.generatedShows.id, showId),
  });

  if (!show) {
    notFound();
  }

  // Redirect to progress page if not ready yet
  if (show.status !== "ready" || !show.muxPlaybackId) {
    redirect(`/create/${showId}`);
  }

  const template = await db.query.showTemplates.findFirst({
    where: eq(schema.showTemplates.id, show.templateId),
  });

  if (!template) {
    notFound();
  }

  const hosts = (template.hosts ?? []) as Array<{ name: string; personality: string; position?: string }>;

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath={`/watch/${showId}`} />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Show Header */}
          <div className="mb-8">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              {template.name}
            </p>
            {(() => {
              // The DB-stored topic may include the user's appended
              // "Additional context from user: …" block. Strip it before
              // rendering the headline, then truncate to one short line.
              const titleSource = show.topic.split(/\n\s*Additional context from user:/i)[0].trim();
              const words = titleSource.split(/\s+/).filter(Boolean);
              const MAX_WORDS = 8;
              const shown = words.length > MAX_WORDS
                ? `${words.slice(0, MAX_WORDS).join(" ")}…`
                : words.join(" ");
              return (
                <h2
                  className="truncate text-3xl font-extrabold tracking-tight md:text-4xl"
                  style={{ fontFamily: "var(--font-syne)" }}
                  title={show.topic}
                >
                  {shown}
                </h2>
              );
            })()}
            <div className="mt-3 flex items-center gap-3">
              <span className="badge" style={{ fontFamily: "var(--font-space-mono)" }}>
                {show.durationSeconds}
                s
              </span>
              <span className="badge" style={{ fontFamily: "var(--font-space-mono)" }}>
                {show.familiarity.toUpperCase()}
              </span>
              {hosts.map(h => (
                <span key={h.name} className="badge badge-sync" style={{ fontFamily: "var(--font-space-mono)" }}>
                  {h.name}
                </span>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <WatchContent
            show={show}
            template={template}
          />
        </div>
      </main>
    </div>
  );
}
