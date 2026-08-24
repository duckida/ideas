"use client";

// IdeaModal — the popup opened from an IdeaCard. Shows the full idea with
// upvote/support actions and the leader timeline below a divider.

import { useState, type FormEvent, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  setUpvote,
  supportIdea,
  unsupportIdea,
  postTimelineUpdate,
  getIdeaSupports,
  getIdea,
} from "@/lib/api";
import { strings, t } from "@/lib/strings";
import type { Idea } from "@/lib/types";

interface IdeaModalProps {
  idea: Idea;
  onClose: () => void;
  /** Called after a mutation so the grid can refresh counts/badges. */
  onMutated: () => void;
}

export function IdeaModal({ idea: initialIdea, onClose, onMutated }: IdeaModalProps) {
  const { user, isLeader } = useAuth();
  const [idea, setIdea] = useState<Idea>(initialIdea);
  const [supports, setSupports] = useState<Array<{ leaderId: string; leaderName: string; leaderTitle?: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [post, setPost] = useState("");
  const [actionError, setActionError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getIdea(initialIdea.id), getIdeaSupports(initialIdea.id)])
      .then(([fresh, sup]) => {
        if (!active) return;
        if (fresh) setIdea(fresh);
        setSupports(sup);
      })
      .catch((err) => {
        // Never swallow silently: a denied supports read (stale rules) or a
        // missing collection-group index shows up here as "support vanished".
        console.error("IdeaModal: failed to refresh idea/supports", err);
      });
    return () => {
      active = false;
    };
  }, [initialIdea.id, reloadTick]);

  const uid = user?.uid;
  const hasUpvoted = uid !== undefined && idea.upvoteUserIds.includes(uid);
  const mySupport = supports.find((s) => s.leaderId === uid);

  async function toggleUpvote() {
    if (!uid || busy) return;
    setBusy(true);
    setActionError(false);
    try {
      await setUpvote(idea.id, uid, !hasUpvoted);
      setIdea((prev) => ({
        ...prev,
        upvoteUserIds: hasUpvoted
          ? prev.upvoteUserIds.filter((id) => id !== uid)
          : [...prev.upvoteUserIds, uid],
        upvoteCount: Math.max(0, prev.upvoteCount + (hasUpvoted ? -1 : 1)),
      }));
      setReloadTick((t) => t + 1);
      onMutated();
    } catch (err) {
      console.error("Failed to save upvote", err);
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSupport() {
    if (!uid || busy || !user) return;
    setBusy(true);
    setActionError(false);
    try {
      if (mySupport) {
        await unsupportIdea(idea.id, uid);
        setSupports((prev) => prev.filter((s) => s.leaderId !== uid));
      } else {
        await supportIdea(idea.id, { uid, displayName: user.displayName, title: user.title });
        setSupports((prev) => [...prev, { leaderId: uid, leaderName: user.displayName, leaderTitle: user.title }]);
      }
      setReloadTick((t) => t + 1);
      onMutated();
    } catch (err) {
      console.error("Failed to save support", err);
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!user || !post.trim() || busy) return;
    setBusy(true);
    setActionError(false);
    try {
      await postTimelineUpdate(idea.id, { uid: user.uid, displayName: user.displayName }, post.trim());
      setPost("");
      setReloadTick((t) => t + 1);
      onMutated();
    } catch (err) {
      console.error("Failed to post timeline update", err);
      setActionError(true);
    } finally {
      setBusy(false);
    }
  }

  const sortedTimeline = [...idea.timeline].sort((a, b) =>
    (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );
  const canPostTimeline = isLeader && !!mySupport;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.25rem] border border-line bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: title + upvote */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-extrabold leading-snug text-ink">{idea.title}</h2>
          <button
            type="button"
            onClick={toggleUpvote}
            disabled={busy || !uid}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold transition disabled:opacity-50 ${
              hasUpvoted
                ? "border-kakao bg-kakao text-ink"
                : "border-line text-ink hover:bg-kakao-soft"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2L10 8H2L6 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {idea.upvoteCount === 1
              ? strings.idea.oneUpvote
              : t(strings.idea.upvotes, { count: idea.upvoteCount })}
          </button>
        </div>

        {/* Author + support */}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>
            {idea.showAuthorName
              ? `by ${idea.authorName}`
              : strings.idea.anonymous}
          </span>
          {idea.showAuthorName && idea.authorTitle && (
            <span className="text-xs font-semibold">({idea.authorTitle})</span>
          )}
          {supports.length > 0 && (
            <span>Supported by {supports.map((s) => s.leaderTitle ? `${s.leaderName} (${s.leaderTitle})` : s.leaderName).join(", ")}</span>
          )}
        </div>

        {/* Failed action (upvote/support/timeline post) */}
        {actionError && (
          <p role="alert" className="mt-3 text-xs font-semibold text-muted">
            {strings.errors.actionFailed}
          </p>
        )}

        {/* Moderation feedback */}
        {idea.moderationFeedback && (
          <div className="mt-3 rounded-xl border border-kakao bg-kakao-soft p-3">
            <p className="text-xs font-bold text-ink">{strings.idea.moderationFeedback}</p>
            <p className="mt-1 text-sm text-muted">{idea.moderationFeedback.message}</p>
          </div>
        )}

        {/* Description */}
        <p className="mt-4 whitespace-pre-wrap leading-relaxed text-foreground">
          {idea.description}
        </p>

        {/* Divider */}
        <hr className="my-6 border-line" />

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-base font-bold text-ink">Timeline</h3>

          {canPostTimeline && (
            <form onSubmit={handlePost} className="mt-3 flex gap-2">
              <input
                value={post}
                onChange={(e) => setPost(e.target.value)}
                placeholder={strings.timeline.postPlaceholder}
                aria-label={strings.timeline.postLabel}
                className="flex-1 rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-kakao"
              />
              <button
                type="submit"
                disabled={busy || !post.trim()}
                className="shrink-0 rounded-full bg-kakao px-4 py-2 text-sm font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
              >
                {strings.timeline.postButton}
              </button>
            </form>
          )}

          {sortedTimeline.length === 0 ? (
            <p className="mt-3 text-sm text-muted">{strings.modal.noTimeline}</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {sortedTimeline.map((entry) => {
                const date = entry.createdAt?.toDate();
                const dateStr = date
                  ? date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "";
                return (
                  <li key={entry.id}>
                    <p className="text-sm leading-relaxed text-foreground">
                      {dateStr}: - {entry.message}
                    </p>
                    <p className="text-xs text-muted">{entry.leaderName}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Leader support button */}
        {isLeader && (
          <button
            type="button"
            onClick={toggleSupport}
            disabled={busy || !uid}
            className={`mt-4 w-full rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
              mySupport
                ? "bg-success text-white"
                : "border border-kakao text-ink hover:bg-kakao-soft"
            }`}
          >
            {mySupport ? strings.idea.supported : strings.idea.support}
          </button>
        )}

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-full border border-line px-4 py-2 text-sm font-bold text-muted transition hover:bg-background"
        >
          {strings.modal.close}
        </button>
      </div>
    </div>
  );
}
