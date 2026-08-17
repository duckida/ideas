"use client";

// EditIdeaDialog — allows editing and resubmitting an idea that was sent back.

import { useState, type FormEvent } from "react";
import { updateIdea } from "@/lib/api";
import { strings } from "@/lib/strings";
import type { Idea } from "@/lib/types";

interface EditIdeaDialogProps {
  idea: Idea;
  onClose: () => void;
  onSaved: () => void;
}

export function EditIdeaDialog({ idea, onClose, onSaved }: EditIdeaDialogProps) {
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [showAuthorName, setShowAuthorName] = useState(idea.showAuthorName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateIdea(idea.id, {
        title: title.trim(),
        description: description.trim(),
        showAuthorName,
      });
      onSaved();
    } catch {
      setError(strings.idea.editError);
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
        <h2 className="text-lg font-extrabold text-ink">{strings.me.editResubmit}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">{strings.idea.titleLabel}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 outline-none focus:border-kakao"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">{strings.idea.descriptionLabel}</span>
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
              {strings.idea.editCancel}
            </button>
            <button
              type="submit"
              disabled={busy || !title.trim() || !description.trim()}
              className="flex-1 rounded-full bg-kakao px-4 py-2.5 font-bold text-ink hover:brightness-95 disabled:opacity-50"
            >
              {strings.idea.editSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
