import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { strings } from "@/lib/strings";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it("renders light, dark and system options", () => {
    renderToggle();

    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: strings.settings.themeDark })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: strings.settings.themeSystem })).toBeInTheDocument();
  });

  it("selects Dark on click, persists the choice and applies data-theme", async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(window.localStorage.getItem("ideas-theme")).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("removes data-theme and the stored key when Auto is chosen", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("ideas-theme", "dark");
    document.documentElement.dataset.theme = "dark";
    renderToggle();

    await user.click(screen.getByRole("radio", { name: strings.settings.themeSystem }));

    expect(screen.getByRole("radio", { name: strings.settings.themeSystem })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(window.localStorage.getItem("ideas-theme")).toBe("system");
  });
});
