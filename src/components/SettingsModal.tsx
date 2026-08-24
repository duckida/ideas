"use client";

// SettingsModal — popup opened from the navbar gear icon. Theme selector on
// top, About text below; all copy is centre-aligned. Closes on backdrop
// click, the ✕ button, or Escape.

import { useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { strings, t } from "@/lib/strings";

const COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "";
const COMMIT_SHORT =
  process.env.NEXT_PUBLIC_GIT_COMMIT_SHORT ?? COMMIT.slice(0, 7);
const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/duckida/ideas";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const hasCommit = COMMIT.length >= 7;

  // Escape closes the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={strings.settings.heading}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[1.25rem] border border-line bg-surface p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={strings.common.close}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-background hover:text-foreground"
        >
          ✕
        </button>

        <h2 className="text-xl font-extrabold text-ink">
          {strings.settings.heading}
        </h2>

        {/* Appearance / theme */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {strings.settings.themeLabel}
          </span>
          <ThemeToggle />
        </div>

        <hr className="my-5 border-line" />

        {/* About */}
        <p className="text-sm leading-relaxed text-foreground">
          {t(strings.settings.aboutApp, { brand: strings.brand.name })}
        </p>
        <p className="mt-3 text-sm text-foreground">
          {strings.settings.aboutMadeBy}
        </p>
        <p className="mt-1 text-sm text-foreground">
          {strings.settings.aboutSupport}{" "}
          <a
            href={`mailto:${strings.settings.supportEmail}`}
            className="font-semibold underline decoration-line hover:decoration-kakao"
          >
            {strings.settings.supportEmail}
          </a>
          .
        </p>

        <p className="mt-4 text-sm text-muted">
          {strings.settings.buildLabel}{" "}
          {hasCommit ? (
            <a
              href={`${REPO_URL}/commit/${COMMIT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm font-medium text-foreground underline decoration-line hover:decoration-kakao"
            >
              {COMMIT_SHORT}
            </a>
          ) : (
            <span className="font-mono text-sm">
              {strings.settings.unknownBuild}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
