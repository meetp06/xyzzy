export const dynamic = "force-dynamic";

import { desc, count as drizzleCount, eq } from "drizzle-orm";
import Link from "next/link";

import { Footer } from "@/app/components/footer";
import { Header } from "@/app/components/header";
import { ShowCard } from "@/app/media/show-card";
import { db, generatedShows, showTemplates } from "@/db";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface MediaPageProps {
  searchParams: Promise<{ page?: string }>;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  const delta = 2;
  const pages: (number | "...")[] = [];

  pages.push(1);

  const rangeStart = Math.max(2, currentPage - delta);
  const rangeEnd = Math.min(totalPages - 1, currentPage + delta);

  if (rangeStart > 2) {
    pages.push("...");
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < totalPages - 1) {
    pages.push("...");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({ currentPage, totalPages, totalItems }: PaginationProps) {
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="mt-12 flex flex-col items-center gap-6 border-t-2 border-border pt-6">
      <p
        className="text-sm text-foreground-muted"
        style={{ fontFamily: "var(--font-space-mono)" }}
      >
        Showing
        {" "}
        {startItem}
        –
        {endItem}
        {" "}
        of
        {" "}
        {totalItems}
        {" "}
        show
        {totalItems !== 1 ? "s" : ""}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {currentPage > 1 ?
              (
                <Link
                  href={`/media?page=${currentPage - 1}`}
                  className="btn-outlined flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </Link>
              ) :
              (
                <span className="flex cursor-not-allowed items-center gap-2 border-3 border-border bg-surface px-4 py-2 text-sm text-foreground-muted opacity-50">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M15 19l-7-7 7-7" />
                  </svg>
                  Prev
                </span>
              )}

          <div
            className="flex items-center gap-1 px-4 text-sm"
            style={{ fontFamily: "var(--font-space-mono)" }}
          >
            {getPageNumbers(currentPage, totalPages).map((page, idx) => {
              const key = page === "..." ? `ellipsis-${idx < 3 ? "start" : "end"}` : `page-${page}`;
              return page === "..." ?
                  (
                    <span
                      key={key}
                      className="flex h-10 w-10 items-center justify-center text-foreground-muted"
                    >
                      …
                    </span>
                  ) :
                  (
                    <Link
                      key={key}
                      href={`/media?page=${page}`}
                      className={`flex h-10 w-10 items-center justify-center border-2 border-border transition-colors ${
                        page === currentPage ?
                          "bg-foreground text-surface" :
                          "bg-surface hover:bg-surface-elevated"
                      }`}
                    >
                      {page}
                    </Link>
                  );
            })}
          </div>

          {currentPage < totalPages ?
              (
                <Link
                  href={`/media?page=${currentPage + 1}`}
                  className="btn-outlined flex items-center gap-2 px-4 py-2 text-sm"
                >
                  Next
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ) :
              (
                <span className="flex cursor-not-allowed items-center gap-2 border-3 border-border bg-surface px-4 py-2 text-sm text-foreground-muted opacity-50">
                  Next
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card-brutal mx-auto max-w-md p-12 text-center">
      <div className="mb-6 text-6xl">📺</div>
      <h3 className="mb-3 text-xl font-bold">No shows yet</h3>
      <p className="mb-6 text-foreground-muted">
        Create your first AI-generated talk show episode.
      </p>
      <Link
        href="/create"
        className="btn-action inline-block"
      >
        Create a Show
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default async function MediaPage({ searchParams }: MediaPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  const [shows, [{ count }]] = await Promise.all([
    db
      .select({
        id: generatedShows.id,
        topic: generatedShows.topic,
        status: generatedShows.status,
        muxPlaybackId: generatedShows.muxPlaybackId,
        durationSeconds: generatedShows.durationSeconds,
        familiarity: generatedShows.familiarity,
        createdAt: generatedShows.createdAt,
        templateName: showTemplates.name,
        showType: showTemplates.showType,
      })
      .from(generatedShows)
      .innerJoin(showTemplates, eq(generatedShows.templateId, showTemplates.id))
      .where(eq(generatedShows.status, "ready"))
      .orderBy(desc(generatedShows.createdAt))
      .limit(ITEMS_PER_PAGE)
      .offset(startIndex),
    db
      .select({ count: drizzleCount() })
      .from(generatedShows)
      .where(eq(generatedShows.status, "ready")),
  ]);

  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const validPage = Math.min(currentPage, Math.max(1, totalPages));

  return (
    <div className="flex min-h-screen flex-col">
      <Header currentPath="/media" />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h2
              className="mb-4 text-4xl font-extrabold tracking-tight md:text-5xl"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              Browse Shows
            </h2>
            <p className="max-w-2xl text-lg text-foreground-muted">
              Previously generated AI talk show episodes. Pick one to rewatch or continue the conversation.
            </p>
          </div>

          {shows.length > 0 ?
              (
                <>
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {shows.map(show => (
                      <ShowCard
                        key={show.id}
                        id={show.id}
                        topic={show.topic}
                        templateName={show.templateName}
                        showType={show.showType}
                        playbackId={show.muxPlaybackId}
                        durationSeconds={show.durationSeconds}
                        createdAt={show.createdAt}
                      />
                    ))}
                  </div>

                  <Pagination
                    currentPage={validPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                  />
                </>
              ) :
              (
                <EmptyState />
              )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
