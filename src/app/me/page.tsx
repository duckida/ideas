"use client";

// Me page — profile heading, "My ideas" (with per-idea delete), and for
// leaders a "Supported ideas" section with the ideas they back.

import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IdeaModal } from "@/components/IdeaModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditIdeaDialog } from "@/components/EditIdeaDialog";
import { getIdeasByAuthor, getLeaderSupports, getIdea, deleteIdea, updateUserTitle } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";
import type { Idea } from "@/lib/types";

export default function MePage() {
  const { user, isLeader, refreshUser } = useAuth();
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [supported, setSupported] = useState<Idea[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [title, setTitle] = useState(user?.title ?? "");
  const [titleBusy, setTitleBusy] = useState(false);
  const [titleNotice, setTitleNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      getIdeasByAuthor(user.uid),
      isLeader ? getLeaderSupports(user.uid) : Promise.resolve([]),
    ])
      .then(async ([mine, supports]) => {
        if (!active) return;
        setMyIdeas(mine);
        if (supports.length > 0) {
          const ideas = await Promise.all(
            supports.map((s) => getIdea(s.ideaId)),
          );
          if (active) setSupported(ideas.filter((i): i is Idea => i !== null));
        } else {
          setSupported([]);
        }
      })
      .catch((err) => console.error("Me: failed to load ideas/supports", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, isLeader, tick]);

  const selected =
    myIdeas.find((i) => i.id === selectedId) ??
    supported.find((i) => i.id === selectedId) ??
    null;

  const editingIdea = editingId ? myIdeas.find((i) => i.id === editingId) ?? null : null;

  async function handleDelete(ideaId: string) {
    if (!user) return;
    setDeleteBusy(true);
    setDeleteError(false);
    try {
      await deleteIdea(ideaId);
      setDeletingId(null);
      refresh();
    } catch {
      // Rules or network error — tell the user instead of silently resyncing.
      setDeleteError(true);
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleSaveTitle() {
    if (!user || titleBusy) return;
    setTitleBusy(true);
    setTitleNotice(null);
    try {
      await updateUserTitle(user.uid, title.trim());
      await refreshUser();
      setTitleNotice({ kind: "ok", text: strings.me.titleSaved });
    } catch {
      setTitleNotice({ kind: "error", text: strings.me.titleError });
    } finally {
      setTitleBusy(false);
    }
  }

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-extrabold text-ink">{strings.me.heading}</h1>
        <p className="mt-1 text-muted">{user?.displayName}</p>

        {/* Leader title input */}
        {isLeader && (
          <div className="mt-4 max-w-sm">
            <label className="block">
              <span className="text-sm font-semibold">{strings.me.title}</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={strings.me.titlePlaceholder}
                className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm outline-none focus:border-kakao"
              />
            </label>
            <button
              type="button"
              onClick={handleSaveTitle}
              disabled={titleBusy || title.trim() === (user?.title ?? "")}
              className="mt-2 rounded-full bg-kakao px-4 py-1.5 text-sm font-bold text-ink transition hover:brightness-95 disabled:opacity-50"
            >
              {titleBusy ? strings.common.loading : strings.common.save}
            </button>
            {titleNotice && (
              <p
                role="alert"
                className={`mt-2 text-xs font-semibold ${
                  titleNotice.kind === "ok" ? "text-success" : "text-danger"
                }`}
              >
                {titleNotice.text}
              </p>
            )}
          </div>
        )}

        {loading ? (
          <p className="mt-8 text-muted">{strings.common.loading}</p>
        ) : (
          <div className="mt-8 space-y-10">
            {/* My ideas */}
            <section>
              <h2 className="text-lg font-extrabold text-ink">{strings.me.myIdeas}</h2>
              {myIdeas.length === 0 ? (
                <p className="mt-3 text-muted">{strings.me.myIdeasEmpty}</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {myIdeas.map((idea) => (
                    <li
                      key={idea.id}
                      className="flex flex-col gap-3 rounded-[1.25rem] border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedId(idea.id)}
                        className="flex-1 text-left"
                      >
                        <p className="font-bold text-ink">{idea.title}</p>
                        <p className="mt-0.5 text-xs font-semibold text-muted">
                          {strings.idea.statusLabel}:{" "}
                          {idea.status === "pending" && strings.idea.statusPending}
                          {idea.status === "approved" && strings.idea.statusApproved}
                          {idea.status === "changes_requested" &&
                            strings.idea.statusChangesRequested}
                          {idea.status === "rejected" && strings.idea.statusRejected}
                        </p>
                      </button>
                      <div className="flex shrink-0 gap-2">
                        {idea.status === "changes_requested" && (
                          <button
                            type="button"
                            onClick={() => setEditingId(idea.id)}
                            className="rounded-full border border-kakao px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-kakao-soft"
                          >
                            {strings.me.editResubmit}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(false);
                            setDeletingId(idea.id);
                          }}
                          className="rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger hover:text-white"
                        >
                          {strings.idea.delete}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Supported ideas (leaders only) */}
            {isLeader && (
              <section>
                <h2 className="text-lg font-extrabold text-ink">
                  {strings.me.supported}
                </h2>
                {supported.length === 0 ? (
                  <p className="mt-3 text-muted">{strings.me.supportedEmpty}</p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {supported.map((idea) => (
                      <li key={idea.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(idea.id)}
                          className="w-full rounded-[1.25rem] border border-line bg-surface p-4 text-left transition hover:shadow-md"
                        >
                          <p className="font-bold text-ink">{idea.title}</p>
                          <p className="mt-0.5 text-sm text-muted">{idea.description}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {selected && (
        <IdeaModal idea={selected} onClose={() => setSelectedId(null)} onMutated={refresh} />
      )}

      {editingIdea && (
        <EditIdeaDialog
          idea={editingIdea}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            refresh();
          }}
        />
      )}

      {deletingId && (
        <ConfirmDialog
          title={strings.idea.deleteConfirm}
          detail={strings.idea.deleteConfirmDetail}
          confirmLabel={strings.idea.delete}
          busy={deleteBusy}
          onConfirm={() => void handleDelete(deletingId)}
          onCancel={() => !deleteBusy && setDeletingId(null)}
        />
      )}
      {deleteError && (
        <p role="alert" className="mt-4 text-sm font-semibold text-danger">
          {strings.idea.deleteError}
        </p>
      )}
    </ProtectedRoute>
  );
}