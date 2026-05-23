import { Header } from "@/app/components/header";

import { getTemplatesAction } from "./actions";
import { CreateForm } from "./create-form";

export default async function CreatePage() {
  const templates = await getTemplatesAction();

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath="/create" />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          {/* Page Header */}
          <div className="mb-10">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Interdimensional Cable
            </p>
            <h2
              className="text-4xl font-extrabold tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Create a Show
            </h2>
          </div>

          <CreateForm templates={templates} />
        </div>
      </main>
    </div>
  );
}
