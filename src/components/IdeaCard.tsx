"use client";

// IdeaCard — a compact card in the ideas grid. Clicking opens the IdeaModal.

import { strings, t } from "@/lib/strings";
import type { Idea } from "@/lib/types";

interface IdeaCardProps {
  idea: Idea;
  /** Number of distinct leaders supporting this idea. */
  supportCount: number;
  onOpen: () => void;
  onUpvote: () => void;
}

export function IdeaCard({ idea, supportCount, onOpen, onUpvote }: IdeaCardProps) {
  const hasSupport = supportCount > 0;

  return (
    <div
      className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <button type="button" onClick={onOpen} className="flex flex-col gap-3 text-left">
        <h3 className="text-lg font-bold leading-snug text-ink">{idea.title}</h3>

        <p className="line-clamp-3 text-sm leading-relaxed text-muted">
          {idea.description}
        </p>
      </button>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted">
            {idea.showAuthorName
              ? `by ${idea.authorName}`
              : strings.idea.anonymous}
          </span>
          {hasSupport && (
            <span className="text-xs font-medium text-muted">
              {strings.ideasHome.supportedByLeaders}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpvote(); }}
          className="shrink-0 flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-ink transition hover:bg-kakao-soft"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2L10 8H2L6 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {idea.upvoteCount}
        </button>
      </div>
    </div>
  );
}
