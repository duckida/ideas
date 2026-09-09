"use client";

// TopicSubmitDialog — the popup leaders use to set a new topic (question).
// Like ideas, the topic starts in `pending` and must be approved by another
// moderator before it appears in the topic box.

import { useState, type FormEvent } from "react";
import { createTopic } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";
import { MAX_TOPIC_LENGTH } from "@/lib/defs";
import { trackTopicSubmitted } from "@/lib/analytics";

export function TopicSubmitDialog({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !question.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createTopic({
        question: question.trim(),
        authorId: user.uid,
        authorName: user.displayName,
      });
      trackTopicSubmitted();
      setStatus("submitted");
      onSubmitted();
    } catch {
      setError(strings.topic.submitError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[1.25rem] bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "submitted" ? (
          <>
            <h2 className="text-lg font-extrabold text-ink">{strings.topic.newTitle}</h2>
            <p className="mt-2 text-sm text-success">{strings.topic.success}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-ink px-4 py-3 font-bold text-white"
            >
              {strings.common.close}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-extrabold text-ink">{strings.topic.newTitle}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold">{strings.topic.questionLabel}</span>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                  maxLength={MAX_TOPIC_LENGTH}
                  placeholder={strings.topic.questionPlaceholder}
                  className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
                />
              </label>
              <p className="text-xs text-muted">{strings.topic.questionHint}</p>

              {error && (
                <p className="text-sm font-medium text-danger" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-full border border-line px-4 py-2.5 font-bold text-muted hover:bg-background"
                >
                  {strings.topic.cancel}
                </button>
                <button
                  type="submit"
                  disabled={busy || !question.trim()}
                  className="flex-1 rounded-full bg-kakao px-4 py-2.5 font-bold text-ink hover:brightness-95 disabled:opacity-50"
                >
                  {strings.topic.submit}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
