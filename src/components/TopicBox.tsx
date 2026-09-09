"use client";

// TopicBox — the question-mode cards at the top of the ideas page. Each live
// topic shows its question, a preview row of approved responses (as many as
// fit), and a circular arrow button linking to the topic's own page with the
// full list. Renders nothing at all when there are no live topics.

import Link from "next/link";
import { strings, t } from "@/lib/strings";
import type { Idea, Topic } from "@/lib/types";


interface TopicBoxProps {
  topics: Topic[];
  /** Approved responses per topic id, newest first, already capped. */
  previews: Map<string, Idea[]>;
  /** Current user's uid, for the upvote toggle state. */
  currentUserId?: string;
  /** Opens the respond dialog for that topic. */
  onRespond: (topic: Topic) => void;
  /** Opens the idea modal for a previewed response. */
  onOpenIdea: (idea: Idea) => void;
  /** Toggles the current user's upvote on a previewed response. */
  onUpvote: (idea: Idea) => void;
}

export function TopicBox({ topics, previews, currentUserId, onRespond, onOpenIdea, onUpvote }: TopicBoxProps) {
  if (topics.length === 0) return null;

  return (
    <div className="mt-4 space-y-4">
      {topics.map((topic) => {
        const responses = previews.get(topic.id) ?? [];
        return (
          <section
            key={topic.id}
            className="rounded-[1.25rem] border border-kakao bg-kakao-soft p-5"
            aria-label={strings.topic.heading}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
                  {strings.topic.heading}
                </p>
                <h2 className="mt-1.5 text-lg font-extrabold leading-snug text-ink">
                  {topic.question}
                </h2>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {t(strings.topic.setBy, { name: topic.authorName })}
                </p>
              </div>
              <Link
                href={`/topics/${topic.id}`}
                aria-label={strings.topic.viewAll}
                title={strings.topic.viewAll}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-kakao bg-surface text-ink transition hover:bg-kakao"
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <path d="M3 7.5H12M12 7.5L8.5 4M12 7.5L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Preview row: approved responses, as many as fit */}
            {responses.length > 0 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {responses.map((idea) => {
                  const hasUpvoted =
                    currentUserId !== undefined && idea.upvoteUserIds.includes(currentUserId);
                  return (
                    <div
                      key={idea.id}
                      onClick={() => onOpenIdea(idea)}
                      className="flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-line bg-surface p-3 transition hover:shadow-md"
                    >
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-ink">
                        {idea.title}
                      </p>
                      {/* Same small upvote button as the grid cards, count-less */}
                      <button
                        type="button"
                        aria-label={strings.idea.upvote}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpvote(idea);
                        }}
                        className={`flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
                          hasUpvoted
                            ? "border-kakao bg-kakao text-ink"
                            : "border-line text-ink hover:bg-kakao-soft"
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M6 2L10 8H2L6 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => onRespond(topic)}
              className="mt-4 rounded-full bg-kakao px-4 py-2 text-sm font-bold text-ink transition hover:brightness-95"
            >
              {strings.topic.respond}
            </button>
          </section>
        );
      })}
    </div>
  );
}
