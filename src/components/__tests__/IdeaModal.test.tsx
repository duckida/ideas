import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdeaModal } from "@/components/IdeaModal";
import { setAuthUser } from "@/test/authMock";
import type { Idea } from "@/lib/types";

const idea: Idea = {
  id: "i1",
  title: "Solar benches",
  description: "Charge your phone in the sun",
  status: "approved",
  authorId: "u1",
  authorName: "Ada",
  upvoteUserIds: [],
  upvoteCount: 2,
  supportCount: 0,
  showAuthorName: true,
  moderationFeedback: null,
  timeline: [],
  createdAt: null,
  updatedAt: null,
};

const api = vi.hoisted(() => ({
  setUpvote: vi.fn(async () => {}),
  supportIdea: vi.fn(async () => {}),
  unsupportIdea: vi.fn(async () => {}),
  postTimelineUpdate: vi.fn(async () => {}),
  getIdeaSupports: vi.fn(async () => []),
  getIdea: vi.fn(async () => null),
}));

vi.mock("@/lib/api", () => api);

vi.mock("@/context/AuthContext", async () => {
  const auth = await vi.importActual<typeof import("@/test/authMock")>("@/test/authMock");
  return { useAuth: () => auth.useAuthState() };
});

beforeEach(() => {
  vi.clearAllMocks();
  setAuthUser(null);
  api.getIdea.mockResolvedValue(null);
  api.getIdeaSupports.mockResolvedValue([]);
});

describe("IdeaModal", () => {
  it("shows the full description and overview tab by default", async () => {
    render(<IdeaModal idea={idea} onClose={vi.fn()} onMutated={vi.fn()} />);
    expect(await screen.findByText(/Charge your phone in the sun/)).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Timeline")).toBeInTheDocument();
  });

  it("shows Anonymous instead of the author when the idea is anonymous", async () => {
    render(<IdeaModal idea={{ ...idea, showAuthorName: false }} onClose={vi.fn()} onMutated={vi.fn()} />);
    expect(await screen.findByText("Anonymous")).toBeInTheDocument();
    expect(screen.queryByText(/by Ada/)).not.toBeInTheDocument();
  });

  it("lets a student upvote and calls setUpvote", async () => {
    setAuthUser({ uid: "u2", email: "b@x.com", displayName: "Bo", role: "student" });
    const user = userEvent.setup();
    render(<IdeaModal idea={idea} onClose={vi.fn()} onMutated={vi.fn()} />);

    const upvote = await screen.findByRole("button", { name: /Upvote/ });
    await user.click(upvote);

    await waitFor(() => expect(api.setUpvote).toHaveBeenCalledWith("i1", "u2", true));
  });

  it("hides the support button for students", async () => {
    setAuthUser({ uid: "u2", email: "b@x.com", displayName: "Bo", role: "student" });
    render(<IdeaModal idea={idea} onClose={vi.fn()} onMutated={vi.fn()} />);
    await screen.findByText(/Charge your phone in the sun/);
    expect(screen.queryByRole("button", { name: "Support" })).not.toBeInTheDocument();
  });

  it("shows a support button for leaders and calls supportIdea", async () => {
    setAuthUser({ uid: "u9", email: "l@x.com", displayName: "Ms. Kim", role: "leader" });
    const user = userEvent.setup();
    render(<IdeaModal idea={idea} onClose={vi.fn()} onMutated={vi.fn()} />);

    const support = await screen.findByRole("button", { name: "Support" });
    await user.click(support);

    await waitFor(() =>
      expect(api.supportIdea).toHaveBeenCalledWith("i1", { uid: "u9", displayName: "Ms. Kim" }),
    );
  });

  it("switches to the timeline tab showing embedded updates", async () => {
    setAuthUser({ uid: "u2", email: "b@x.com", displayName: "Bo", role: "student" });
    const withTimeline: Idea = {
      ...idea,
      timeline: [
        {
          id: "t1",
          leaderId: "u9",
          leaderName: "Ms. Kim",
          message: "Funding secured!",
          createdAt: null,
        },
      ],
    };
    const user = userEvent.setup();
    render(<IdeaModal idea={withTimeline} onClose={vi.fn()} onMutated={vi.fn()} />);

    await user.click(screen.getByText("Timeline"));
    expect(await screen.findByText("Funding secured!")).toBeInTheDocument();
    expect(screen.getByText(/Ms. Kim/)).toBeInTheDocument();
  });
});