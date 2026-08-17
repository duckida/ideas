"use client";

// Moderation page — leaders/admins review newly submitted ideas. They can
// approve outright, or send the author back with a request-changes message.
// A leaderboard below shows each moderator's stats. All copy comes from
// strings.ts.

import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute, RoleGate } from "@/components/ProtectedRoute";
import { ModerationItem } from "@/components/ModerationItem";
import { getPendingIdeas, getModeratedIdeas, getLeaders } from "@/lib/api";
import { strings } from "@/lib/strings";
import type { Idea } from "@/lib/types";

interface LeaderStats {
  uid: string;
  name: string;
  total: number;
  approved: number;
  sentBack: number;
}

export default function ModerationPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState<LeaderStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    getPendingIdeas()
      .then((list) => {
        if (active) setIdeas(list);
      })
      .catch(() => {})
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
          const fb = idea.moderationFeedback;
          if (!fb) continue;
          const existing = map.get(fb.by);
          const entry = existing ?? {
            uid: fb.by,
            name: nameMap.get(fb.by) ?? fb.by,
            total: 0,
            approved: 0,
            sentBack: 0,
          };
          entry.total++;
          if (idea.status === "approved") entry.approved++;
          else entry.sentBack++;
          if (!existing) map.set(fb.by, entry);
        }
        setStats([...map.values()].sort((a, b) => b.total - a.total));
      })
      .catch(() => {})
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
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          <h1 className="text-2xl font-extrabold text-ink">{strings.moderation.heading}</h1>

          {loading ? (
            <p className="mt-8 text-muted">{strings.common.loading}</p>
          ) : ideas.length === 0 ? (
            <p className="mt-8 text-muted">{strings.moderation.empty}</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {ideas.map((idea) => (
                <li key={idea.id}>
                  <ModerationItem idea={idea} onDone={refresh} />
                </li>
              ))}
            </ul>
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