import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// The commit values are inlined at build time; control them via the env in
// each test and re-import the module so its module-level constants refresh.
// SettingsContent renders the theme selector, so the ThemeProvider is imported
// from the same (possibly reset) module registry to keep one context instance.
async function freshModules() {
  vi.resetModules();
  const [settings, theme] = await Promise.all([
    import("@/components/SettingsContent"),
    import("@/context/ThemeContext"),
  ]);
  return {
    SettingsContent: settings.SettingsContent,
    ThemeProvider: theme.ThemeProvider,
  };
}

function renderWithTheme(
  ThemeProvider: (props: { children: React.ReactNode }) => React.JSX.Element,
  ui: React.ReactElement,
) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("SettingsContent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("shows the app blurb, maker and support email", async () => {
    const { SettingsContent, ThemeProvider } = await freshModules();
    renderWithTheme(ThemeProvider, <SettingsContent />);

    expect(
      screen.getByRole("heading", { name: "About" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/place where students share ideas/)).toBeInTheDocument();
    expect(screen.getByText("Made by Nishant Tandon.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "n.tandon@whatever.com" }),
    ).toHaveAttribute("href", "mailto:n.tandon@whatever.com");
  });

  it("links the short commit hash on GitHub in a mono font", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIT_COMMIT", "2a69461abcdef1234567890abcdef1234567890");
    vi.stubEnv("NEXT_PUBLIC_GIT_COMMIT_SHORT", "2a69461");

    const { SettingsContent, ThemeProvider } = await freshModules();
    renderWithTheme(ThemeProvider, <SettingsContent />);

    const link = screen.getByRole("link", { name: "2a69461" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/duckida/ideas/commit/2a69461abcdef1234567890abcdef1234567890",
    );
    expect(link).toHaveClass("font-mono");
  });

  it("falls back to a non-linked development-build label without a commit", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIT_COMMIT", "");
    delete process.env.NEXT_PUBLIC_GIT_COMMIT_SHORT;

    const { SettingsContent, ThemeProvider } = await freshModules();
    renderWithTheme(ThemeProvider, <SettingsContent />);

    expect(screen.getByText("development build")).toBeInTheDocument();
  });
});
