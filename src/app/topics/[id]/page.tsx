"use client";

// Topic page — the full view of one topic (question): the question, a
// respond button, and every approved response in a grid. Reached from the
// circular arrow button on a topic card.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaModal } from "@/components/IdeaModal";
import { SubmitDialog } from "@/components/SubmitDialog";
import { getTopic, getApprovedIdeasByTopic, getSupportsForIdeas, setUpvote } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings, t } from "@/lib/strings";
import { trackIdeaOpen, trackIdeaUpvote, trackTopicOpen } from "@/lib/analytics";
import type { Idea, SupportDoc, Topic } from "@/lib/types";

export default function TopicPage() {
  const params = useParams<{ id: string }>();
  const topicId = params?.id;
  const { user } = useAuth();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [supportsMap, setSupportsMap] = useState<Map<string, SupportDoc[]>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRespond, setShowRespond] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    trackTopicOpen();
  }, [topicId]);

  useEffect(() => {
    if (!topicId) return;
    let active = true;
    (async () => {
      try {
        const [topicDoc, responses] = await Promise.all([
          getTopic(topicId),
          getApprovedIdeasByTopic(topicId),
        ]);
        if (!active) return;
        setTopic(topicDoc);
        setIdeas(responses);
        setLoadError(false);
        try {
          const map = await getSupportsForIdeas(responses.map((i) => i.id));
          if (active) setSupportsMap(map);
        } catch (err) {
          // Supporter names are supplementary — never blank the grid for them.
          console.error("Failed to load supporter names", err);
        }
      } catch (err) {
        console.error("Failed to load topic page", err);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [topicId, tick]);

  const toggleUpvote = useCallback(
    async (idea: Idea) => {
      if (!user) return;
      const uid = user.uid;
      const hasUpvoted = idea.upvoteUserIds.includes(uid);
      const active = !hasUpvoted;

      // Optimistic update
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id
            ? {
                ...i,
                upvoteUserIds: active
                  ? [...i.upvoteUserIds, uid]
                  : i.upvoteUserIds.filter((id) => id !== uid),
                upvoteCount: Math.max(0, i.upvoteCount + (active ? 1 : -1)),
              }
            : i,
        ),
      );

      try {
        await setUpvote(idea.id, uid, active);
        trackIdeaUpvote(active, "card");
      } catch (err) {
        console.error("Failed to save upvote", err);
        // Revert on failure
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === idea.id
              ? {
                  ...i,
                  upvoteUserIds: active
                    ? i.upvoteUserIds.filter((id) => id !== uid)
                    : [...i.upvoteUserIds, uid],
                  upvoteCount: Math.max(0, i.upvoteCount + (active ? -1 : 1)),
                }
              : i,
          ),
        );
      }
    },
    [user],
  );

  const selected = useMemo(
    () => ideas.find((i) => i.id === selectedId) ?? null,
    [ideas, selectedId],
  );

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        {loading ? (
          <p className="mt-8 text-muted">{strings.common.loading}</p>
        ) : loadError ? (
          <div className="mt-8">
            <p className="text-muted">{strings.ideasHome.loadError}</p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-background"
            >
              {strings.ideasHome.retry}
            </button>
          </div>
        ) : !topic ? (
          <p className="mt-8 text-muted">{strings.topic.notFound}</p>
        ) : (
          <>
            <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
              {strings.topic.heading}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold leading-snug text-ink">
              {topic.question}
            </h1>
            <p className="mt-1 text-xs font-semibold text-muted">
              {t(strings.topic.setBy, { name: topic.authorName })}
            </p>
            <button
              type="button"
              onClick={() => setShowRespond(true)}
              className="mt-4 rounded-full bg-kakao px-4 py-2 text-sm font-bold text-ink transition hover:brightness-95"
            >
              {strings.topic.respond}
            </button>

            <h2 className="mt-8 text-lg font-extrabold text-ink">
              {strings.topic.responsesHeading}
            </h2>
            {ideas.length === 0 ? (
              <p className="mt-3 text-muted">{strings.topic.responsesEmpty}</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ideas.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    supports={supportsMap.get(idea.id) ?? []}
                    currentUserId={user?.uid}
                    onOpen={() => {
                      trackIdeaOpen("card");
                      setSelectedId(idea.id);
                    }}
                    onUpvote={() => toggleUpvote(idea)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selected && (
        <IdeaModal idea={selected} onClose={() => setSelectedId(null)} onMutated={refresh} />
      )}
      {showRespond && topic && (
        <SubmitDialog
          topic={topic}
          onClose={() => setShowRespond(false)}
          onSubmitted={refresh}
        />
      )}
    </ProtectedRoute>
  );
}
