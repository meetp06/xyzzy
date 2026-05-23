export const dynamic = "force-dynamic";

import { asc, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import Link from "next/link";
import { Pool } from "pg";

import { Header } from "@/app/components/header";
import { env } from "@/app/lib/env";
import * as schema from "@/db/schema";

import { TemplateCard } from "./template-card";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

export default async function TemplatesPage() {
  const templates = await db
    .select()
    .from(schema.showTemplates)
    .orderBy(desc(schema.showTemplates.isDefault), asc(schema.showTemplates.createdAt));

  // Get show counts per template
  const showCounts = await db
    .select({
      templateId: schema.generatedShows.templateId,
      total: count(),
    })
    .from(schema.generatedShows)
    .groupBy(schema.generatedShows.templateId);

  const countMap = new Map(showCounts.map(r => [r.templateId, r.total]));

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath="/templates" />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Page Header */}
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p
                className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-foreground-muted"
                style={{ fontFamily: "var(--font-space-mono)" }}
              >
                Manage
              </p>
              <h2
                className="text-3xl font-extrabold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-syne)" }}
              >
                Templates
              </h2>
            </div>
            <Link
              href="/templates/create"
              className="flex items-center gap-1 border-3 border-border bg-accent px-5 py-2 text-sm font-bold uppercase tracking-wider shadow-[3px_3px_0_var(--border)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--border)]"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Create Template
            </Link>
          </div>

          {/* Template Grid */}
          {templates.length === 0 ? (
            <div className="border-3 border-border p-12 text-center">
              <p className="text-foreground-muted">No templates yet. Create your first one.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  showCount={countMap.get(template.id) ?? 0}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
