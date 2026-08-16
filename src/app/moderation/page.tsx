"use client";

// Moderation page — leaders/admins review newly submitted ideas. They can
// approve outright, or send the author back with a request-changes message,
// or reject with a message. All copy comes from strings.ts.

import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleGate } from "@/components/ProtectedRoute";
import { ModerationItem } from "@/components/ModerationItem";
import { getPendingIdeas } from "@/lib/api";
import { strings } from "@/lib/strings";
import type { Idea } from "@/lib/types";

export default function ModerationPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

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
        </main>
      </ProtectedRoute>
    </RoleGate>
  );
}