"use client";

// IdeaCard — a compact card in the ideas grid. Clicking opens the IdeaModal.

import { strings, t } from "@/lib/strings";
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
  // Fallback when the supporter-name docs couldn't be loaded: the idea doc's
  // denormalized count still proves (and shows) that leaders backed it.
  const supportCountOnly = !hasSupport && idea.supportCount > 0;
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
              ? (<>
                  <span className="font-bold text-ink">{idea.authorName}</span>
                  {idea.authorTitle ? ` (${idea.authorTitle})` : ""}
                </>)
              : strings.idea.anonymous}
          </span>
          {hasSupport && (
            <span className="text-xs font-medium text-muted">
              {t(strings.idea.supportedBy, {
                name: supports.map((s) => s.leaderTitle ? `${s.leaderName} (${s.leaderTitle})` : s.leaderName).join(", "),
              })}
            </span>
          )}
          {supportCountOnly && (
            <span className="text-xs font-medium text-muted">
              {idea.supportCount === 1
                ? strings.idea.oneSupporter
                : t(strings.idea.supportedByCount, { count: idea.supportCount })}
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
