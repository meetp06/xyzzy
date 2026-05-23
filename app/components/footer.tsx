import Image from "next/image";
import Link from "next/link";

function LogoMark() {
  return (
    <svg width="40" height="22" viewBox="0 0 44 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="3" width="14" height="20" rx="3" fill="white" />
      <rect x="16" y="3" width="12" height="20" rx="3" fill="white" />
      <rect x="30" y="3" width="14" height="20" rx="3" fill="white" />
    </svg>
  );
}

interface FooterProps {
  variant?: "full" | "minimal";
}

export function Footer({ variant = "minimal" }: FooterProps) {
  if (variant === "full") {
    return (
      <footer className="relative z-20 mt-auto flex flex-col items-center gap-6 border-t border-white/5 bg-black/60 py-16 text-center backdrop-blur-3xl">
        <LogoMark />
        <div className="flex flex-wrap items-center justify-center gap-6 opacity-70">
          <a href="https://gemini.google.com/" target="_blank" rel="noreferrer" aria-label="Google Gemini">
            <Image src="/gemini-logo-white.svg" alt="Google Gemini" width={120} height={24} style={{ height: "auto", width: "auto" }} />
          </a>
          <a href="https://www.mux.com/" target="_blank" rel="noreferrer" aria-label="Mux">
            <Image src="/mux-logo-small-white.svg" alt="Mux" width={80} height={24} style={{ height: "auto", width: "auto" }} />
          </a>
          <a href="https://github.com/vercel/workflow" target="_blank" rel="noreferrer" aria-label="Vercel Workflow">
            <Image src="/vercel.svg" alt="Vercel" width={76} height={20} style={{ height: "auto", width: "auto" }} />
          </a>
        </div>
        <p className="max-w-md text-xs font-light text-white/40">
          AI-generated talk shows — pick a format, give it a topic, watch it come to life
        </p>
      </footer>
    );
  }

  return (
    <footer className="relative z-20 mt-auto flex flex-col items-center gap-4 border-t border-white/5 bg-black/40 py-10 text-center backdrop-blur-3xl">
      <LogoMark />
      <p className="text-xs font-light text-white/40">
        © 2026 Scripted
      </p>
      <div className="flex items-center gap-6">
        <Link href="/" className="text-xs font-light text-white/40 hover:text-white">Home</Link>
        <Link href="/create" className="text-xs font-light text-white/40 hover:text-white">Create</Link>
        <a
          href="https://github.com/meetp06/xyzzy"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-light text-white/40 hover:text-white"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
