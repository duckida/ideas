"use client";

// SettingsContent — theme selector plus the About section: what the app is,
// who made it, the support contact, and the build commit linked on GitHub.
// The commit short SHA is rendered in a monospace font.

import { ThemeToggle } from "@/components/ThemeToggle";
import { strings, t } from "@/lib/strings";

const COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "";
const COMMIT_SHORT =
  process.env.NEXT_PUBLIC_GIT_COMMIT_SHORT ?? COMMIT.slice(0, 7);
const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/duckida/ideas";

export function SettingsContent() {
  const hasCommit = COMMIT.length >= 7;

  return (
    <div className="space-y-10">
      {/* Appearance / theme */}
      <section>
        <h2 className="text-lg font-extrabold text-ink">
          {strings.settings.appearance}
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <span className="text-sm font-semibold text-foreground">
            {strings.settings.themeLabel}
          </span>
          <ThemeToggle />
        </div>
      </section>

      {/* About */}
      <section>
        <h2 className="text-lg font-extrabold text-ink">
          {strings.settings.aboutHeading}
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-foreground">
          {t(strings.settings.aboutApp, { brand: strings.brand.name })}
        </p>
        <p className="mt-3 max-w-prose text-sm text-foreground">
          {strings.settings.aboutMadeBy}
        </p>
        <p className="mt-1 max-w-prose text-sm text-foreground">
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
      </section>
    </div>
  );
}
