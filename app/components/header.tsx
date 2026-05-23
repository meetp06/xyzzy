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

interface HeaderProps {
  currentPath?: string;
}

const NAV_LINKS = [
  { label: "Templates", path: "/templates" },
  { label: "Browse", path: "/media" },
];

export function Header({ currentPath }: HeaderProps) {
  return (
    <nav className="fixed top-5 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap">
      <div className="liquid-glass flex items-center gap-6 rounded-full px-4 py-2.5">
        <Link href="/" aria-label="Home">
          <LogoMark />
        </Link>

        <div className="flex items-center gap-5">
          {NAV_LINKS.map(link => (
            <Link
              key={link.path}
              href={link.path}
              className={`text-sm font-light transition-colors duration-200 ${
                currentPath?.startsWith(link.path)
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-4 flex items-center gap-3">
          <Link
            href="/create"
            className="liquid-glass-strong rounded-full px-4 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.04] hover:shadow-[0_0_16px_2px_rgba(255,255,255,0.12)] active:scale-[0.97]"
          >
            Create show
          </Link>
        </div>
      </div>
    </nav>
  );
}
