"use client";

// Moderation page — leaders/admins review newly submitted ideas. They can
// approve outright, or send the author back with a request-changes message.
// A leaderboard below shows each moderator's stats. All copy comes from
// strings.ts.

import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute, RoleGate } from "@/components/ProtectedRoute";
import { ModerationItem } from "@/components/ModerationItem";
import { TopicModerationItem } from "@/components/TopicModerationItem";
import { getPendingIdeas, getModeratedIdeas, getLeaders, getPendingTopics } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { strings } from "@/lib/strings";
import type { Idea, Topic } from "@/lib/types";

interface LeaderStats {
  uid: string;
  name: string;
  total: number;
  approved: number;
  sentBack: number;
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState<LeaderStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  // A moderator never reviews their own submission — those are hidden from
  // this queue (and firestore.rules reject the write anyway).
  const ownHidden =
    ideas.some((i) => i.authorId === user?.uid) ||
    topics.some((tp) => tp.authorId === user?.uid);

  useEffect(() => {
    let active = true;
    Promise.all([getPendingIdeas(), getPendingTopics()])
      .then(([ideaList, topicList]) => {
        if (!active) return;
        setIdeas(ideaList);
        setTopics(topicList);
      })
      .catch((err) => console.error("Moderation: failed to load queue", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  useEffect(() => {
    let active = true;
    Promise.all([getModeratedIdeas(), getLeaders()])
      .then(([ideas, leaders]) => {
        if (!active) return;
        const nameMap = new Map<string, string>();
        for (const l of leaders) nameMap.set(l.uid, l.displayName);
        const map = new Map<string, LeaderStats>();
        for (const idea of ideas) {
          const modBy = idea.moderatedBy;
          if (!modBy) continue;
          const existing = map.get(modBy);
          const entry = existing ?? {
            uid: modBy,
            name: nameMap.get(modBy) ?? modBy,
            total: 0,
            approved: 0,
            sentBack: 0,
          };
          entry.total++;
          if (idea.status === "approved") entry.approved++;
          else entry.sentBack++;
          if (!existing) map.set(modBy, entry);
        }
        setStats([...map.values()].sort((a, b) => b.total - a.total));
      })
      .catch((err) => console.error("Leaderboard: failed to load stats", err))
      .finally(() => {
        if (active) setStatsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <RoleGate roles={["leader", "admin"]}>
      <ProtectedRoute>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-extrabold text-ink">{strings.moderation.heading}</h1>

          {loading ? (
            <p className="mt-8 text-muted">{strings.common.loading}</p>
          ) : (
            <>
              {/* Topics awaiting review */}
              <h2 className="mt-6 text-lg font-extrabold text-ink">
                {strings.topic.moderationHeading}
              </h2>
              {topics.filter((tp) => tp.authorId !== user?.uid).length === 0 ? (
                <p className="mt-3 text-muted">{strings.topic.moderationEmpty}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {topics
                    .filter((tp) => tp.authorId !== user?.uid)
                    .map((topic) => (
                      <li key={topic.id}>
                        <TopicModerationItem topic={topic} onDone={refresh} />
                      </li>
                    ))}
                </ul>
              )}

              {/* Ideas awaiting review */}
              <h2 className="mt-10 text-lg font-extrabold text-ink">
                {strings.moderation.ideasHeading}
              </h2>
              {ownHidden && (
                <p className="mt-2 text-xs font-semibold text-muted">
                  {strings.topic.selfHidden}
                </p>
              )}
              {ideas.filter((i) => i.authorId !== user?.uid).length === 0 ? (
                <p className="mt-3 text-muted">{strings.moderation.empty}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {ideas
                    .filter((i) => i.authorId !== user?.uid)
                    .map((idea) => (
                      <li key={idea.id}>
                        <ModerationItem idea={idea} onDone={refresh} />
                      </li>
                    ))}
                </ul>
              )}
            </>
          )}

          <h2 className="mt-12 text-lg font-extrabold text-ink">{strings.leaderboard.heading}</h2>

          {statsLoading ? (
            <p className="mt-4 text-muted">{strings.common.loading}</p>
          ) : stats.length === 0 ? (
            <p className="mt-4 text-muted">{strings.leaderboard.empty}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.map((s, i) => (
                <li
                  key={s.uid}
                  className="flex items-center gap-4 rounded-[1.25rem] border border-line bg-surface p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kakao-soft text-lg font-extrabold text-ink">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-ink">{s.name}</p>
                    <p className="text-xs text-muted">
                      {s.approved} {strings.leaderboard.approved} · {s.sentBack} {strings.leaderboard.sentBack}
                    </p>
                  </div>
                  <span className="text-lg font-extrabold text-ink">{s.total}</span>
                </li>
              ))}
            </ul>
          )}
        </main>
      </ProtectedRoute>
    </RoleGate>
  );
}