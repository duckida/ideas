import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

// The commit values are inlined at build time; control them via the env in
// each test and re-import the module so its module-level constants refresh.
async function freshModules() {
  vi.resetModules();
  const [modal, theme] = await Promise.all([
    import("@/components/SettingsModal"),
    import("@/context/ThemeContext"),
  ]);
  return { SettingsModal: modal.SettingsModal, ThemeProvider: theme.ThemeProvider };
}

describe("SettingsModal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("shows heading, app blurb, maker and support email, all centred", async () => {
    const { SettingsModal, ThemeProvider } = await freshModules();
    render(
      <ThemeProvider>
        <SettingsModal onClose={() => {}} />
      </ThemeProvider>,
    );

    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // The card centres its content.
    expect(dialog.firstElementChild).toHaveClass("text-center");

    expect(screen.getByText(/place where students share ideas/)).toBeInTheDocument();
    expect(screen.getByText("Made by Nishant Tandon.")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "n.tandon@whatever.com" }),
    ).toHaveAttribute("href", "mailto:n.tandon@whatever.com");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeInTheDocument();
  });

  it("links the short commit hash on GitHub in a mono font", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIT_COMMIT", "4ae57fbdeadbeef1234567890abcdef123456789");
    vi.stubEnv("NEXT_PUBLIC_GIT_COMMIT_SHORT", "4ae57fb");

    const { SettingsModal, ThemeProvider } = await freshModules();
    render(
      <ThemeProvider>
        <SettingsModal onClose={() => {}} />
      </ThemeProvider>,
    );

    const link = screen.getByRole("link", { name: "4ae57fb" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/duckida/ideas/commit/4ae57fbdeadbeef1234567890abcdef123456789",
    );
    expect(link).toHaveClass("font-mono");
  });

  it("falls back to a non-linked development-build label without a commit", async () => {
    vi.stubEnv("NEXT_PUBLIC_GIT_COMMIT", "");
    delete process.env.NEXT_PUBLIC_GIT_COMMIT_SHORT;

    const { SettingsModal, ThemeProvider } = await freshModules();
    render(
      <ThemeProvider>
        <SettingsModal onClose={() => {}} />
      </ThemeProvider>,
    );

    expect(screen.getByText("development build")).toBeInTheDocument();
  });

  it("closes via the ✕ button, backdrop click and Escape", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    const onClose = vi.fn();
    const { SettingsModal, ThemeProvider } = await freshModules();
    render(
      <ThemeProvider>
        <SettingsModal onClose={onClose} />
      </ThemeProvider>,
    );

    // ✕ button
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Escape key
    fireEventKeyDownEscape();
    function fireEventKeyDownEscape() {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape" }),
      );
    }
    expect(onClose).toHaveBeenCalledTimes(2);

    // Backdrop click — the overlay itself is the dialog element.
    await user.click(screen.getByRole("dialog", { name: "Settings" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
