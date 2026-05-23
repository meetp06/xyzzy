import Link from "next/link";

import { Footer } from "@/app/components/footer";
import { Header } from "@/app/components/header";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-white">
      <Header currentPath="/" />

      <section className="relative z-10 flex h-screen min-h-[760px] w-full flex-col justify-between px-10 pt-[160px] pb-12">
        {/* Hero title */}
        <div className="flex w-full justify-center">
          <h1 className="hero-title select-none drop-shadow-2xl">Scripted</h1>
        </div>

        {/* Bottom row */}
        <div className="flex w-full flex-col items-center justify-between gap-8 md:flex-row md:items-end md:gap-0">
          <p className="max-w-[240px] text-center text-sm font-light leading-relaxed text-white/75 drop-shadow-lg md:text-left">
            AI-generated late-night talk shows. Pick a host style, drop a topic, watch your episode appear.
          </p>

          <div className="flex items-center gap-3 md:absolute md:bottom-12 md:left-1/2 md:-translate-x-1/2">
            <Link
              href="/create"
              className="group relative overflow-hidden rounded-full bg-white px-6 py-3 text-sm font-medium text-black shadow-[0_0_0_0_rgba(255,255,255,0)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_24px_4px_rgba(255,255,255,0.25)] active:scale-[0.97]"
            >
              <span className="relative z-10">Create a show</span>
              <span className="absolute inset-0 bg-gradient-to-b from-white to-white/85 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
            </Link>

            <Link
              href="/media"
              className="liquid-glass group rounded-full px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.03] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_0_20px_2px_rgba(255,255,255,0.07)] active:scale-[0.97]"
            >
              Browse library
            </Link>
          </div>

          <p className="max-w-[240px] text-center text-sm font-light leading-relaxed text-white/75 drop-shadow-lg md:text-right">
            Veo 3.1 video. Gemini 3.5 Flash script & chat. Native TTS dubbing in 5 languages.
          </p>
        </div>
      </section>

      {/* Feature strip */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { n: "01", title: "Pick a show", body: "Late-night templates with distinct host voices, formats, and personalities." },
            { n: "02", title: "Drop a topic", body: "URL, Hacker News thread, or free text. Gemini researches it deep." },
            { n: "03", title: "Watch the episode", body: "Veo generates clips, stitches them, dubs to your language, chat with the host." },
          ].map(step => (
            <div key={step.n} className="card-brutal p-6">
              <div className="mb-3 text-xs font-light tracking-[0.25em] text-white/40">
                {step.n}
              </div>
              <h3 className="mb-2 text-2xl italic text-white" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                {step.title}
              </h3>
              <p className="text-sm font-light leading-relaxed text-white/65">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <Footer variant="full" />
    </div>
  );
}
