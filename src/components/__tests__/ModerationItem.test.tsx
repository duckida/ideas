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
  showAuthorName: true,
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

  it("shows the real author to moderators even when anonymous", () => {
    render(<ModerationItem idea={{ ...pending, showAuthorName: false }} onDone={vi.fn()} />);
    expect(screen.getByText("Ada (Anonymous)")).toBeInTheDocument();
  });

  it("shows the author's email to moderators when the idea is not anonymous", () => {
    render(
      <ModerationItem idea={{ ...pending, authorEmail: "ada@example.com" }} onDone={vi.fn()} />,
    );
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("does not expose the email to moderators when the idea is anonymous", () => {
    render(
      <ModerationItem
        idea={{ ...pending, showAuthorName: false, authorEmail: "ada@example.com" }}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText("Ada (Anonymous)")).toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
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

  it("rejects an idea immediately", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    render(<ModerationItem idea={pending} onDone={onDone} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(api.moderateIdea).toHaveBeenCalledWith("i1", "reject", "", "mod1"),
    );
    expect(onDone).toHaveBeenCalled();
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject" })).not.toBeInTheDocument();
  });
});