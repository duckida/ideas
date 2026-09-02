"use client";

// ModerationItem — a single pending idea in the review queue. The moderator
// can approve, or send back with a message that is stored and shown back
// to the author.

import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteIdea, moderateIdea, type ModerationAction } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings, t } from "@/lib/strings";
import { trackModerationApprove, trackModerationChangesRequested, trackModerationDelete } from "@/lib/analytics";
import type { Idea } from "@/lib/types";

interface ModerationItemProps {
  idea: Idea;
  onDone: () => void;
}

export function ModerationItem({ idea, onDone }: ModerationItemProps) {
  const { user, isAdmin } = useAuth();
  const [mode, setMode] = useState<"idle" | "request_changes">("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!isAdmin || busy) return;
    setBusy(true);
    try {
      await deleteIdea(idea.id);
      trackModerationDelete();
      setShowDeleteConfirm(false);
      onDone();
    } finally {
      setBusy(false);
    }
  }

  async function act(action: ModerationAction, feedback: string) {
    if (!user || busy) return;
    setBusy(true);
    try {
      await moderateIdea(idea.id, action, feedback, user.uid);
      if (action === "approve") {
        trackModerationApprove();
      } else {
        trackModerationChangesRequested();
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[1.25rem] border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-ink">{idea.title}</h3>
        <span className="shrink-0 rounded-full bg-kakao-soft px-2.5 py-1 text-xs font-bold text-ink">
          {idea.status === "changes_requested" ? strings.idea.statusChangesRequested : strings.idea.statusPending}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
        {idea.description}
      </p>
      <p className="mt-2 text-xs font-semibold text-muted">
        {idea.showAuthorName
          ? idea.authorName
          : t(strings.moderation.anonymousFormat, {
              name: idea.authorName,
              anonymous: strings.idea.anonymous,
            })}
        {idea.showAuthorName && idea.authorEmail && (
          <span className="ml-2 font-normal text-muted">{idea.authorEmail}</span>
        )}
      </p>

      {mode === "idle" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => act("approve", "")}
            disabled={busy}
            className="rounded-full bg-success px-4 py-2 text-sm font-bold text-white transition hover:brightness-95 disabled:opacity-50"
          >
            {strings.moderation.approve}
          </button>
          <button
            type="button"
            onClick={() => setMode("request_changes")}
            disabled={busy}
            className="rounded-full border border-kakao px-4 py-2 text-sm font-bold text-ink transition hover:bg-kakao-soft disabled:opacity-50"
          >
            {strings.moderation.requestChanges}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={busy}
              className="rounded-full border border-danger/40 px-4 py-2 text-sm font-bold text-danger transition hover:bg-danger hover:text-white disabled:opacity-50"
            >
              {strings.idea.delete}
            </button>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(mode, message.trim());
          }}
          className="mt-4 space-y-3"
        >
          <label className="block">
            <span className="text-sm font-semibold">{strings.moderation.feedbackLabel}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={strings.moderation.feedbackPlaceholder}
              rows={3}
              className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-kakao"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="rounded-full border border-line px-4 py-2 text-sm font-bold text-muted hover:bg-background"
            >
              {strings.common.cancel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {strings.moderation.requestChangesConfirm}
            </button>
          </div>
        </form>
      )}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={strings.idea.deleteConfirm}
          detail={strings.idea.deleteConfirmDetail}
          confirmLabel={strings.idea.delete}
          busy={busy}
          onConfirm={() => void handleDelete()}
          onCancel={() => !busy && setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}