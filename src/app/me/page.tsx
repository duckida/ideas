"use client";

// Me page — profile heading, "My ideas" (with per-idea delete), and for
// leaders a "Supported ideas" section with the ideas they back.

import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IdeaModal } from "@/components/IdeaModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getIdeasByAuthor, getLeaderSupports, getIdea, deleteIdea } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";
import type { Idea } from "@/lib/types";

export default function MePage() {
  const { user, isLeader } = useAuth();
  const [myIdeas, setMyIdeas] = useState<Idea[]>([]);
  const [supported, setSupported] = useState<Idea[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

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
      .catch(() => {})
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

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-extrabold text-ink">{strings.me.heading}</h1>
        <p className="mt-1 text-muted">{user?.displayName}</p>

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
                      className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-line bg-surface p-4"
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
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(false);
                          setDeletingId(idea.id);
                        }}
                        className="shrink-0 rounded-full border border-danger/40 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger hover:text-white"
                      >
                        {strings.idea.delete}
                      </button>
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