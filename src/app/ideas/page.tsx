"use client";

// Ideas home — the clean grid of approved ideas. Clicking a card opens the
// IdeaModal; the + FAB opens the submit form (goes to moderation).

import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaModal } from "@/components/IdeaModal";
import { FabAdd } from "@/components/FabAdd";
import { SubmitDialog } from "@/components/SubmitDialog";
import { getApprovedIdeas, getSupportsForIdeas, setUpvote, getActiveTopics, getApprovedIdeasByTopic } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";
import { trackIdeaOpen, trackIdeaUpvote, trackIdeasSort, trackIdeasSearchOpen } from "@/lib/analytics";
import { TopicBox } from "@/components/TopicBox";
import { TopicSubmitDialog } from "@/components/TopicSubmitDialog";
import type { Idea, SupportDoc, Topic } from "@/lib/types";

/** How many approved responses each topic card previews; the rest live on
 * the topic's own page (arrow button). */
const TOPIC_PREVIEW_COUNT = 4;

export default function IdeasPage() {
  const { user, isLeader } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [supportsMap, setSupportsMap] = useState<Map<string, SupportDoc[]>>(new Map());
  const [supportersError, setSupportersError] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [previews, setPreviews] = useState<Map<string, Idea[]>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showTopicSubmit, setShowTopicSubmit] = useState(false);
  const [respondTopic, setRespondTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);
  const [sort, setSort] = useState<"new" | "upvotes">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ideas_sort") as "new" | "upvotes") || "new";
    }
    return "new";
  });
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");

  const refresh = useCallback(() => setTick((t) => t + 1), []);

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

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const liveTopics = await getActiveTopics();
        if (!active) return;
        setTopics(liveTopics);
        // Preview responses per topic — a small capped query each; the full
        // lists live on each topic's page.
        const lists = await Promise.all(
          liveTopics.map((tp) => getApprovedIdeasByTopic(tp.id, TOPIC_PREVIEW_COUNT)),
        );
        if (!active) return;
        setPreviews(new Map(liveTopics.map((tp, i) => [tp.id, lists[i]])));
      } catch (err) {
        console.error("Failed to load topics", err);
      }
    })();
    return () => {
      active = false;
    };
  }, [tick]);

  useEffect(() => {
    let active = true;
    getApprovedIdeas(sort)
      .then(async (list) => {
        if (!active) return;
        setLoadError(false);
        setIdeas(list);
        // Supporter names load separately from the feed itself: a failure here
        // (e.g. a missing supports index or stale rules) must not blank the
        // whole grid, and must be visible instead of silently swallowed.
        setSupportersError(false);
        try {
          const map = await getSupportsForIdeas(list.map((i) => i.id));
          if (active) setSupportsMap(map);
        } catch (err) {
          console.error("Failed to load supporter names", err);
          if (active) setSupportersError(true);
        }
      })
      .catch((err) => {
        // A failed feed (e.g. a missing Firestore index) must be visible — a
        // silent catch here made the sort toggle look broken. Cleared again
        // once a fetch succeeds.
        console.error("Failed to load approved ideas", err);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick, sort]);

  const selected = useMemo(() => {
    const all = [...ideas, ...[...previews.values()].flat()];
    return all.find((i) => i.id === selectedId) ?? null;
  }, [ideas, previews, selectedId]);

  function handleSort(value: "new" | "upvotes") {
    setSort(value);
    localStorage.setItem("ideas_sort", value);
    trackIdeasSort(value);
  }

  const visibleIdeas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }, [ideas, query]);

  function toggleSearch() {
    setShowSearch((prev) => {
      if (prev) setQuery("");
      else trackIdeasSearchOpen();
      return !prev;
    });
  }

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-extrabold text-ink sm:text-2xl">{strings.ideasHome.heading}</h1>
          <div className="flex items-center gap-2">
            {isLeader && (
              <button
                type="button"
                onClick={() => setShowTopicSubmit(true)}
                className="shrink-0 rounded-full border border-kakao bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-kakao-soft"
              >
                {strings.topic.newTopic}
              </button>
            )}
            <button
              type="button"
              onClick={toggleSearch}
              aria-expanded={showSearch}
              aria-label={strings.ideasHome.search}
              title={strings.ideasHome.search}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                showSearch
                  ? "border-kakao bg-kakao text-ink"
                  : "border-line bg-surface text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="4.25" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={refresh}
              aria-label={strings.ideasHome.refresh}
              title={strings.ideasHome.refresh}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:bg-background hover:text-foreground"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path d="M13.5 7.5C13.5 10.8137 10.8137 13.5 7.5 13.5C4.18629 13.5 1.5 10.8137 1.5 7.5C1.5 4.18629 4.18629 1.5 7.5 1.5C9.63672 1.5 11.5038 2.63623 12.5218 4.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M13.5 1.5V5.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex rounded-full border border-line bg-surface p-1">
              <button
                type="button"
                onClick={() => handleSort("new")}
                className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:px-3 ${
                  sort === "new"
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-background"
                }`}
              >
                {strings.ideasHome.sortNew}
              </button>
              <button
                type="button"
                onClick={() => handleSort("upvotes")}
                className={`rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:px-3 ${
                  sort === "upvotes"
                    ? "bg-ink text-white"
                    : "text-muted hover:bg-background"
                }`}
              >
                {strings.ideasHome.sortUpvotes}
              </button>
            </div>
          </div>
        </div>

        {/* Question mode: one card per live topic, with response previews */}
        <TopicBox
          topics={topics}
          previews={previews}
          onRespond={(topic) => setRespondTopic(topic)}
          onOpenIdea={(idea) => {
            trackIdeaOpen("card");
            setSelectedId(idea.id);
          }}
        />

        {showSearch && (
          <div className="mt-4">
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={strings.ideasHome.searchPlaceholder}
              aria-label={strings.ideasHome.search}
              className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink placeholder:text-muted focus:border-kakao focus:outline-none"
            />
          </div>
        )}

        {supportersError && (
          <p role="alert" className="mt-4 text-xs font-semibold text-muted">
            {strings.ideasHome.supportersError}
          </p>
        )}
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
        ) : ideas.length === 0 ? (
          <p className="mt-8 text-muted">{strings.ideasHome.empty}</p>
        ) : visibleIdeas.length === 0 ? (
          <p className="mt-8 text-muted">{strings.ideasHome.noResults}</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleIdeas.map((idea) => (
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
      </main>

      <FabAdd onClick={() => setShowSubmit(true)} />

      {selected && (
        <IdeaModal idea={selected} onClose={() => setSelectedId(null)} onMutated={refresh} />
      )}
      {showSubmit && <SubmitDialog onClose={() => setShowSubmit(false)} onSubmitted={refresh} />}
      {respondTopic && (
        <SubmitDialog
          topic={respondTopic}
          onClose={() => setRespondTopic(null)}
          onSubmitted={refresh}
        />
      )}
      {showTopicSubmit && (
        <TopicSubmitDialog
          onClose={() => setShowTopicSubmit(false)}
          onSubmitted={refresh}
        />
      )}
    </ProtectedRoute>
  );
}