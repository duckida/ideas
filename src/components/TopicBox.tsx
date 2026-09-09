"use client";

// TopicBox — the question-mode box at the top of the ideas page. Shows the
// topic (question) the leaders set, with a button to respond to it like an
// idea. Leaders/admins also get a "Set a topic" button; when no topic is
// live, the box renders for them only (as the entry point to set one).

import { strings, t } from "@/lib/strings";
import type { Topic } from "@/lib/types";

interface TopicBoxProps {
  topic: Topic | null;
  /** Leaders/admins see the "Set a topic" action (and the empty state). */
  canSetTopic: boolean;
  onRespond: () => void;
  onNewTopic: () => void;
}

export function TopicBox({ topic, canSetTopic, onRespond, onNewTopic }: TopicBoxProps) {
  if (!topic && !canSetTopic) return null;

  return (
    <section
      className="mt-4 rounded-[1.25rem] border border-kakao bg-kakao-soft p-5"
      aria-label={strings.topic.heading}
    >
      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
        {strings.topic.heading}
      </p>
      {topic ? (
        <>
          <h2 className="mt-1.5 text-lg font-extrabold leading-snug text-ink">
            {topic.question}
          </h2>
          <p className="mt-1 text-xs font-semibold text-muted">
            {t(strings.topic.setBy, { name: topic.authorName })}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRespond}
              className="rounded-full bg-kakao px-4 py-2 text-sm font-bold text-ink transition hover:brightness-95"
            >
              {strings.topic.respond}
            </button>
            {canSetTopic && (
              <button
                type="button"
                onClick={onNewTopic}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:bg-background"
              >
                {strings.topic.newTopic}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">{strings.topic.empty}</p>
          <button
            type="button"
            onClick={onNewTopic}
            className="rounded-full bg-kakao px-4 py-2 text-sm font-bold text-ink transition hover:brightness-95"
          >
            {strings.topic.newTopic}
          </button>
        </div>
      )}
    </section>
  );
}
