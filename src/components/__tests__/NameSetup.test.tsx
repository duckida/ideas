import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NameSetup } from "@/components/NameSetup";
import { setAuthUser } from "@/test/authMock";
import { strings } from "@/lib/strings";

const authApi = vi.hoisted(() => ({
  setUserDisplayName: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth", () => authApi);

vi.mock("@/context/AuthContext", async () => {
  const auth = await vi.importActual<typeof import("@/test/authMock")>(
    "@/test/authMock",
  );
  return { useAuth: () => auth.useAuthState() };
});

beforeEach(() => {
  vi.clearAllMocks();
  authApi.setUserDisplayName.mockResolvedValue(undefined);
  // A signed-in user without a display name yet.
  setAuthUser({ uid: "u1", email: "a@x.com", displayName: "", role: "student", displayNameSet: false });
});

describe("NameSetup", () => {
  it("asks for a name and keeps the submit disabled until one is typed", () => {
    render(<NameSetup />);
    expect(screen.getByRole("heading", { name: strings.auth.nameSetupTitle })).toBeInTheDocument();

    const submit = screen.getByRole("button", { name: "Save name" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    const input = screen.getByLabelText("Display name");
    expect(input).toHaveValue("");
  });

  it("saves the chosen display name", async () => {
    const user = userEvent.setup();
    render(<NameSetup />);

    await user.type(screen.getByLabelText("Display name"), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() =>
      expect(authApi.setUserDisplayName).toHaveBeenCalledWith("Ada Lovelace"),
    );
  });

  it("shows an error when saving fails and keeps the dialog open", async () => {
    const user = userEvent.setup();
    authApi.setUserDisplayName.mockRejectedValue(new Error("no-perms"));
    render(<NameSetup />);

    await user.type(screen.getByLabelText("Display name"), "Ada");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't save your name. Please try again.",
    );
    expect(screen.getByRole("heading", { name: strings.auth.nameSetupTitle })).toBeInTheDocument();
  });
});