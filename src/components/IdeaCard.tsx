"use client";

// IdeaCard — a compact card in the ideas grid. Clicking opens the IdeaModal.

import { strings } from "@/lib/strings";
import type { Idea, SupportDoc } from "@/lib/types";

interface IdeaCardProps {
  idea: Idea;
  /** Leaders supporting this idea. */
  supports: SupportDoc[];
  currentUserId?: string;
  onOpen: () => void;
  onUpvote: () => void;
}

export function IdeaCard({ idea, supports, currentUserId, onOpen, onUpvote }: IdeaCardProps) {
  const hasSupport = supports.length > 0;
  const hasUpvoted = currentUserId !== undefined && idea.upvoteUserIds.includes(currentUserId);

  return (
    <div
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <h3 className="text-lg font-bold leading-snug text-ink">{idea.title}</h3>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted">
        {idea.description}
      </p>

      <div className="mt-auto flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted">
            {idea.showAuthorName
              ? `by ${idea.authorName}`
              : strings.idea.anonymous}
          </span>
          {idea.showAuthorName && idea.authorTitle && (
            <span className="text-xs font-semibold text-muted">{idea.authorTitle}</span>
          )}
          {hasSupport && (
            <span className="text-xs font-medium text-muted">
              {supports.map((s) => s.leaderTitle ? `${s.leaderName} (${s.leaderTitle})` : s.leaderName).join(", ")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpvote(); }}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition ${
            hasUpvoted
              ? "border-kakao bg-kakao text-ink"
              : "border-line text-ink hover:bg-kakao-soft"
          }`}
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
