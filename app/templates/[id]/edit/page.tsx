import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { notFound } from "next/navigation";
import { Pool } from "pg";

import { Header } from "@/app/components/header";
import { env } from "@/app/lib/env";
import * as schema from "@/db/schema";

import { TemplateForm } from "../../template-form";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await db.query.showTemplates.findFirst({
    where: eq(schema.showTemplates.id, id),
  });

  if (!template) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath="/templates" />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Templates
            </p>
            <h2
              className="text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Edit: {template.name}
            </h2>
          </div>

          <TemplateForm template={template} />
        </div>
      </main>
    </div>
  );
}
