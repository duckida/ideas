import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModerationItem } from "@/components/ModerationItem";
import { setAuthUser } from "@/test/authMock";
import type { Idea } from "@/lib/types";

const pending: Idea = {
  id: "i1",
  title: "Solar benches",
  description: "Charge your phone in the sun",
  status: "pending",
  authorId: "u1",
  authorName: "Ada",
  upvoteUserIds: [],
  upvoteCount: 0,
  supportCount: 0,
  moderationFeedback: null,
  timeline: [],
  createdAt: null,
  updatedAt: null,
};

const api = vi.hoisted(() => ({
  moderateIdea: vi.fn(async () => {}),
}));

vi.mock("@/lib/api", () => api);

vi.mock("@/context/AuthContext", async () => {
  const auth = await vi.importActual<typeof import("@/test/authMock")>("@/test/authMock");
  return { useAuth: () => auth.useAuthState() };
});

beforeEach(() => {
  vi.clearAllMocks();
  setAuthUser({ uid: "mod1", email: "m@x.com", displayName: "Mod", role: "leader" });
});

describe("ModerationItem", () => {
  it("shows the submitted idea with its author", () => {
    render(<ModerationItem idea={pending} onDone={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Solar benches" })).toBeInTheDocument();
    expect(screen.getByText(/Charge your phone in the sun/)).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("approves immediately without a message", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ModerationItem idea={pending} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(api.moderateIdea).toHaveBeenCalledWith("i1", "approve", "", "mod1"),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("rejects with a message", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ModerationItem idea={pending} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const textbox = screen.getByRole("textbox");
    await user.type(textbox, "Out of scope");
    await user.click(screen.getByRole("button", { name: "Reject idea" }));

    await waitFor(() =>
      expect(api.moderateIdea).toHaveBeenCalledWith("i1", "reject", "Out of scope", "mod1"),
    );
    expect(onDone).toHaveBeenCalled();
  });

  it("requests changes with a message", async () => {
    const user = userEvent.setup();
    render(<ModerationItem idea={pending} onDone={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Request changes" }));
    await user.type(screen.getByRole("textbox"), "Add a budget");
    await user.click(screen.getByRole("button", { name: "Send changes request" }));

    await waitFor(() =>
      expect(api.moderateIdea).toHaveBeenCalledWith("i1", "request_changes", "Add a budget", "mod1"),
    );
  });
});