"use client";

// SubmitDialog — the "+" popup for adding an idea. Title + description go to
// moderation (status: pending).

import { useState, type FormEvent } from "react";
import { createIdea } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";

export function SubmitDialog({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showAuthorName, setShowAuthorName] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitted">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createIdea({
        title: title.trim(),
        description: description.trim(),
        authorId: user.uid,
        authorName: user.displayName,
        authorTitle: user.title,
        authorEmail: user.email ?? undefined,
        showAuthorName,
      });
      setStatus("submitted");
      onSubmitted();
    } catch {
      setError(strings.fab.submitError);
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
            <h2 className="text-lg font-extrabold text-ink">{strings.fab.title}</h2>
            <p className="mt-2 text-sm text-success">{strings.fab.success}</p>
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
            <h2 className="text-lg font-extrabold text-ink">{strings.fab.title}</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold">{strings.fab.titleLabel}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">{strings.fab.descriptionLabel}</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
                />
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={showAuthorName}
                  onChange={(e) => setShowAuthorName(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line accent-kakao"
                />
                <span className="text-sm text-muted">
                  <span className="font-semibold text-ink">{strings.fab.revealName}</span>
                  <br />
                  {strings.fab.revealNameHint}
                </span>
              </label>

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
                  {strings.fab.cancel}
                </button>
                <button
                  type="submit"
                  disabled={busy || !title.trim() || !description.trim()}
                  className="flex-1 rounded-full bg-kakao px-4 py-2.5 font-bold text-ink hover:brightness-95 disabled:opacity-50"
                >
                  {strings.fab.submit}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}