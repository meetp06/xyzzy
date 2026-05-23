import { notFound } from "next/navigation";

import { Header } from "@/app/components/header";

import { getShowWithTemplateAction } from "./actions";
import { GenerationProgress } from "./generation-progress";

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ showId: string }>;
}) {
  const { showId } = await params;
  const data = await getShowWithTemplateAction(showId);

  if (!data) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath={`/create/${showId}`} />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <p
              className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-foreground-muted"
              style={{ fontFamily: "var(--font-space-mono)" }}
            >
              Generating Your Show
            </p>
            <h2
              className="text-3xl font-extrabold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {data.template.name}
            </h2>
          </div>

          <GenerationProgress show={data.show} template={data.template} />
        </div>
      </main>
    </div>
  );
}
