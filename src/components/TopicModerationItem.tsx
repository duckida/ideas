"use client";

// TopicModerationItem — a pending topic in the review queue. Moderators can
// approve (goes live in the topic box) or reject it. The moderation page
// never shows a moderator their own topic, and firestore.rules block the
// write anyway.

import { useState } from "react";
import { moderateTopic } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings, t } from "@/lib/strings";
import { trackModerationApprove, trackModerationReject } from "@/lib/analytics";
import type { Topic } from "@/lib/types";

interface TopicModerationItemProps {
  topic: Topic;
  onDone: () => void;
}

export function TopicModerationItem({ topic, onDone }: TopicModerationItemProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function act(action: "approve" | "reject") {
    if (!user || busy) return;
    setBusy(true);
    try {
      await moderateTopic(topic.id, action, user.uid);
      if (action === "approve") trackModerationApprove();
      else trackModerationReject();
      setDone(true);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[1.25rem] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-ink">{topic.question}</h3>
        <span className="shrink-0 rounded-full bg-kakao-soft px-2.5 py-1 text-xs font-bold text-ink">
          {strings.idea.statusPending}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">
        {t(strings.topic.submittedBy, { name: topic.authorName })}
      </p>

      {done ? (
        <p className="mt-4 text-sm font-semibold text-muted">Reviewed</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => act("approve")}
            disabled={busy}
            className="rounded-full bg-success px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {strings.topic.approve}
          </button>
          <button
            type="button"
            onClick={() => act("reject")}
            disabled={busy}
            className="rounded-full border border-danger/40 px-4 py-2 text-sm font-bold text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
          >
            {strings.topic.reject}
          </button>
        </div>
      )}
    </div>
  );
}
