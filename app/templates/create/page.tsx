import { Header } from "@/app/components/header";

import { TemplateForm } from "../template-form";

export default function CreateTemplatePage() {
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
              Create Template
            </h2>
          </div>

          <TemplateForm />
        </div>
      </main>
    </div>
  );
}
