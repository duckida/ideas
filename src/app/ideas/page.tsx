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
import { getApprovedIdeas } from "@/lib/api";
import { strings } from "@/lib/strings";
import type { Idea } from "@/lib/types";

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let active = true;
    getApprovedIdeas()
      .then((list) => {
        if (!active) return;
        setIdeas(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tick]);

  const selected = useMemo(
    () => ideas.find((i) => i.id === selectedId) ?? null,
    [ideas, selectedId],
  );

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-extrabold text-ink">{strings.ideasHome.heading}</h1>

        {loading ? (
          <p className="mt-8 text-muted">{strings.common.loading}</p>
        ) : ideas.length === 0 ? (
          <p className="mt-8 text-muted">{strings.ideasHome.empty}</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                supportCount={idea.supportCount}
                onOpen={() => setSelectedId(idea.id)}
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
    </ProtectedRoute>
  );
}