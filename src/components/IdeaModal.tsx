"use client";

// IdeaModal — the popup opened from an IdeaCard. Overview tab shows the full
// description + upvote/support actions; Timeline tab shows the leader updates
// embedded in the idea doc (and lets a supporting leader post new ones).

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
  const [tab, setTab] = useState<"overview" | "timeline">("overview");
  const [supports, setSupports] = useState<Array<{ leaderId: string; leaderName: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [post, setPost] = useState("");

  useEffect(() => {
    let active = true;
    // Keep the modal fresh: reload the idea + its supports on open and when
    // the parent signals a mutation.
    Promise.all([getIdea(idea.id), getIdeaSupports(idea.id)])
      .then(([fresh, sup]) => {
        if (!active) return;
        if (fresh) setIdea(fresh);
        setSupports(sup);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [idea.id, onMutated]);

  const uid = user?.uid;
  const hasUpvoted = uid !== undefined && idea.upvoteUserIds.includes(uid);
  const mySupport = supports.find((s) => s.leaderId === uid);

  async function toggleUpvote() {
    if (!uid || busy) return;
    setBusy(true);
    try {
      await setUpvote(idea.id, uid, !hasUpvoted);
      setIdea((prev) => ({
        ...prev,
        upvoteUserIds: hasUpvoted
          ? prev.upvoteUserIds.filter((id) => id !== uid)
          : [...prev.upvoteUserIds, uid],
        upvoteCount: Math.max(0, prev.upvoteCount + (hasUpvoted ? -1 : 1)),
      }));
      onMutated();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSupport() {
    if (!uid || busy || !user) return;
    setBusy(true);
    try {
      if (mySupport) {
        await unsupportIdea(idea.id, uid);
        setSupports((prev) => prev.filter((s) => s.leaderId !== uid));
      } else {
        await supportIdea(idea.id, { uid, displayName: user.displayName });
        setSupports((prev) => [...prev, { leaderId: uid, leaderName: user.displayName }]);
      }
      onMutated();
    } finally {
      setBusy(false);
    }
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!user || !post.trim() || busy) return;
    setBusy(true);
    try {
      await postTimelineUpdate(idea.id, { uid: user.uid, displayName: user.displayName }, post.trim());
      setPost("");
      onMutated();
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
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.25rem] bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            <h2 className="text-xl font-extrabold leading-snug text-ink">{idea.title}</h2>
            <p className="mt-1 text-sm text-muted">
              {t(strings.idea.author, { name: idea.authorName })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={strings.modal.close}
            className="rounded-full p-2 text-muted transition hover:bg-background hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-line px-6 pt-2">
          {(
            [
              ["overview", strings.modal.overviewTab],
              ["timeline", strings.modal.timelineTab],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-t-xl px-4 py-2 text-sm font-bold transition ${
                tab === key
                  ? "border-b-2 border-kakao text-ink"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === "overview" ? (
            <div className="space-y-4">
              <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                {idea.description}
              </p>

              {supports.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-ink">
                    {strings.ideasHome.supportedByLeaders}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {supports.map((s) => (
                      <span
                        key={s.leaderId}
                        className="rounded-full bg-kakao px-3 py-1 text-xs font-bold text-ink"
                      >
                        {s.leaderName}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={toggleUpvote}
                  disabled={busy || !uid}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                    hasUpvoted
                      ? "bg-ink text-white"
                      : "bg-kakao-soft text-ink hover:bg-kakao"
                  }`}
                >
                  {hasUpvoted ? "▲" : "△"} {strings.idea.upvote} · {idea.upvoteCount}
                </button>

                {isLeader && (
                  <button
                    type="button"
                    onClick={toggleSupport}
                    disabled={busy || !uid}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${
                      mySupport
                        ? "bg-success text-white"
                        : "border border-kakao text-ink hover:bg-kakao-soft"
                    }`}
                  >
                    {mySupport ? strings.idea.supported : strings.idea.support}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {canPostTimeline && (
                <form onSubmit={handlePost} className="flex gap-2">
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
                <p className="text-sm text-muted">{strings.modal.noTimeline}</p>
              ) : (
                <ul className="space-y-3">
                  {sortedTimeline.map((entry) => (
                    <li key={entry.id} className="rounded-xl bg-background p-3">
                      <p className="text-sm leading-relaxed text-foreground">{entry.message}</p>
                      <p className="mt-1 text-xs font-semibold text-muted">
                        {t(strings.timeline.byLeader, { name: entry.leaderName })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}