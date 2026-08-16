"use client";

// FabAdd — the floating "+" action button. Opens the submit-an-idea dialog.

import { strings } from "@/lib/strings";

export function FabAdd({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={strings.fab.add}
      title={strings.fab.add}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-kakao text-3xl font-extrabold text-ink shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      +
    </button>
  );
}