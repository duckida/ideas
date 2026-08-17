"use client";

// IdeaCard — a compact card in the ideas grid. Clicking opens the IdeaModal.

import { strings, t } from "@/lib/strings";
import type { Idea } from "@/lib/types";

interface IdeaCardProps {
  idea: Idea;
  /** Number of distinct leaders supporting this idea. */
  supportCount: number;
  onOpen: () => void;
}

export function IdeaCard({ idea, supportCount, onOpen }: IdeaCardProps) {
  const hasSupport = supportCount > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-snug text-ink">{idea.title}</h3>
        <span className="shrink-0 rounded-full bg-kakao-soft px-2.5 py-1 text-xs font-bold text-ink">
          {idea.upvoteCount} {strings.idea.upvotes}
        </span>
      </div>

      <p className="line-clamp-3 text-sm leading-relaxed text-muted">
        {idea.description}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">
          {idea.showAuthorName
            ? t(strings.idea.author, { name: idea.authorName })
            : strings.idea.anonymous}
        </span>
        {hasSupport && (
          <span className="rounded-full bg-kakao px-2.5 py-1 text-xs font-bold text-ink">
            {strings.ideasHome.supportedByLeaders}
          </span>
        )}
      </div>
    </button>
  );
}