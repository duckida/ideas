"use client";

// ThemeToggle — segmented Light / Dark / System selector, styled like the
// sort pills on the ideas page. Radio-group semantics with roving focus.

import { useTheme, type Theme } from "@/context/ThemeContext";
import { strings } from "@/lib/strings";

const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "light", label: strings.settings.themeLight },
  { value: "dark", label: strings.settings.themeDark },
  { value: "system", label: strings.settings.themeSystem },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label={strings.settings.themeLabel}
      className="inline-flex rounded-full border border-line bg-surface p-1"
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(option.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              selected
                ? "bg-kakao text-ink"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
