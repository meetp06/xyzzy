import Link from "next/link";

import { Footer } from "@/app/components/footer";
import { Header } from "@/app/components/header";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath="/" />

      <main className="flex-1 px-6 py-12 md:py-16">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Hero */}
          <section className="panel-brutal overflow-hidden">
            <div className="p-8 md:p-12">
              <div className="space-y-6">
                <p
                  className="text-xs font-bold uppercase tracking-[0.3em] text-foreground-muted"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  AI TALK SHOWS
                </p>

                <h1
                  className="text-4xl font-extrabold tracking-tight md:text-6xl"
                  style={{ fontFamily: "var(--font-syne)" }}
                >
                  Your topic.
                  <br />
                  Their personality.
                  <br />
                  <span className="text-accent">Your show.</span>
                </h1>

                <p className="max-w-2xl text-lg leading-relaxed text-foreground-muted md:text-xl">
                  Pick a late-night talk show style like John Oliver, Seth Meyers, or SNL Weekend Update.
                  Give it any topic. Watch an AI-generated episode come to life in seconds.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/create" className="btn-action group inline-flex items-center justify-center">
                    Create a Show
                    <span className="arrow-icon ml-2">↗</span>
                  </Link>

                  <Link
                    href="/media"
                    className="btn-outlined inline-flex items-center justify-center"
                    style={{ fontFamily: "var(--font-space-mono)" }}
                  >
                    Browse shows
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section>
            <div
              className="section-header-brutal stripes-dark text-white"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              HOW IT WORKS
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <div className="card-brutal flex flex-col p-6">
                <div
                  className="mb-3 text-3xl font-extrabold text-accent"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  01
                </div>
                <h3 className="mb-2 text-lg font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>
                  Pick a show
                </h3>
                <p className="text-sm leading-relaxed text-foreground-muted">
                  Choose from talk show templates — each with unique host personalities, humor styles, and show formats.
                </p>
              </div>

              <div className="card-brutal flex flex-col p-6">
                <div
                  className="mb-3 text-3xl font-extrabold text-accent"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  02
                </div>
                <h3 className="mb-2 text-lg font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>
                  Give it a topic
                </h3>
                <p className="text-sm leading-relaxed text-foreground-muted">
                  Paste a news link, Hacker News article, or just describe what you want the show to cover. The AI researches it deeply.
                </p>
              </div>

              <div className="card-brutal flex flex-col p-6">
                <div
                  className="mb-3 text-3xl font-extrabold text-accent"
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  03
                </div>
                <h3 className="mb-2 text-lg font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>
                  Watch your episode
                </h3>
                <p className="text-sm leading-relaxed text-foreground-muted">
                  The system generates a script, produces video clips, and stitches them into a watchable episode — complete with the host&apos;s personality.
                </p>
              </div>
            </div>
          </section>

          {/* Show Templates Preview */}
          <section>
            <div
              className="section-header-brutal stripes-accent text-foreground"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              AVAILABLE SHOWS
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                {
                  name: "John Oliver",
                  type: "MONOLOGUE",
                  image: "/templates/john-oliver.png",
                  description: "Deep-dive investigative humor with elaborate analogies that escalate to ridiculous extremes.",
                },
                {
                  name: "Seth Meyers",
                  type: "MONOLOGUE",
                  image: "/templates/seth-meyers.png",
                  description: "Sharp, witty political commentary with surgical precision and dry humor.",
                },
                {
                  name: "Weekend Update",
                  type: "CONVERSATION",
                  image: "/templates/snl-weekend-update.png",
                  description: "Colin Jost and Michael Che trade headlines with contrasting styles — polished vs. loose cannon.",
                },
              ].map(show => (
                <div key={show.name} className="card-brutal overflow-hidden">
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={show.image}
                      alt={show.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span
                      className="absolute bottom-3 left-4 text-sm font-bold uppercase tracking-[0.2em] text-white"
                      style={{ fontFamily: "var(--font-space-mono)" }}
                    >
                      {show.name}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-syne)" }}>
                        {show.name}
                      </h3>
                      <span className="badge badge-sync">{show.type}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground-muted">
                      {show.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer variant="full" />
    </div>
  );
}
