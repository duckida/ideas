"use client";

// ThemeContext — light / dark / system theme preference.
//
// The chosen value is persisted in localStorage ("ideas-theme") and exposed
// through useSyncExternalStore, so React re-renders whenever the stored value
// changes (including from another tab) without any setState-in-effect
// cascades. Applying the theme to <html data-theme> happens in an effect —
// a plain DOM side effect, mirroring the pre-paint bootstrap script in
// layout.tsx.
//
// All storage/matchMedia access is guarded so SSR, jsdom and private browsing
// fall back to the light default instead of crashing.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "ideas-theme";
const DEFAULT_THEME: Theme = "system";

/* ------------------------------------------------------------------ */
/* External store: the persisted theme preference                      */
/* ------------------------------------------------------------------ */

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Cross-tab sync; same-tab writes notify via emit().
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", emit);
  };
}

function getSnapshot(): Theme {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // Storage unavailable (private mode etc.) — fall through to default.
  }
  return DEFAULT_THEME;
}

function getServerSnapshot(): Theme {
  return DEFAULT_THEME;
}

/* ------------------------------------------------------------------ */
/* DOM application                                                     */
/* ------------------------------------------------------------------ */

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  } catch {
    return false;
  }
}

/** Apply (or clear) the data-theme attribute on <html> for a resolved theme. */
function applyResolvedTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  if (dark) {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Sync <html data-theme> with the current preference, including live OS
  // changes while on "system". Re-runs (and re-subscribes) when the user
  // switches preference.
  useEffect(() => {
    const apply = () => applyResolvedTheme(theme);
    apply();

    let media: MediaQueryList | undefined;
    if (theme === "system") {
      try {
        media = window.matchMedia?.("(prefers-color-scheme: dark)");
        media?.addEventListener("change", apply);
      } catch {
        // matchMedia unavailable — static fallback is fine.
      }
    }
    return () => {
      media?.removeEventListener("change", apply);
    };
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable — keep the choice for this session only.
    }
    emit();
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
