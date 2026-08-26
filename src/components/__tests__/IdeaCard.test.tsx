import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdeaCard } from "@/components/IdeaCard";
import { setAuthUser } from "@/test/authMock";
import type { Idea, SupportDoc } from "@/lib/types";

const idea: Idea = {
  id: "i1",
  title: "Solar benches",
  description: "Charge your phone in the sun",
  status: "approved",
  authorId: "u1",
  authorName: "Ada",
  upvoteUserIds: [],
  upvoteCount: 3,
  supportCount: 0,
  showAuthorName: true,
  moderationFeedback: null,
  timeline: [],
  createdAt: null,
  updatedAt: null,
};

const noSupports: SupportDoc[] = [];

function makeSupport(name: string, title?: string): SupportDoc {
  return { ideaId: "i1", leaderId: `l_${name}`, leaderName: name, leaderTitle: title, createdAt: null };
}

beforeEach(() => setAuthUser(null));

describe("IdeaCard", () => {
  it("shows title, description, author and upvote count", () => {
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supports={noSupports} onOpen={vi.fn()} onUpvote={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Solar benches" })).toBeInTheDocument();
    expect(screen.getByText(/Charge your phone in the sun/)).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows leader names and titles when supported", () => {
    render(
      <IdeaCard
        idea={{ ...idea, id: "i1" }}
        supports={[makeSupport("Ms. Kim", "Digital Leader"), makeSupport("Mr. Park")]}
        onOpen={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );
    expect(screen.getByText(/Supported by Ms\. Kim \(Digital Leader\), Mr\. Park/)).toBeInTheDocument();
  });

  it("hides the author when showAuthorName is false", () => {
    render(<IdeaCard idea={{ ...idea, id: "i1", showAuthorName: false }} supports={noSupports} onOpen={vi.fn()} onUpvote={vi.fn()} />);
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.queryByText(/Ada/)).not.toBeInTheDocument();
  });

  it("does not show support text without support", () => {
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supports={noSupports} onOpen={vi.fn()} onUpvote={vi.fn()} />);
    expect(screen.queryByText(/Ms\. Kim/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Supported by/)).not.toBeInTheDocument();
  });

  it("falls back to the denormalized support count when names are missing", () => {
    render(
      <IdeaCard
        idea={{ ...idea, id: "i1", supportCount: 2 }}
        supports={noSupports}
        onOpen={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );
    expect(screen.getByText("Supported by 2 leaders")).toBeInTheDocument();
  });

  it("uses singular wording for a single supporter without names", () => {
    render(
      <IdeaCard
        idea={{ ...idea, id: "i1", supportCount: 1 }}
        supports={noSupports}
        onOpen={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );
    expect(screen.getByText("Supported by 1 leader")).toBeInTheDocument();
  });

  it("prefers supporter names over the count fallback", () => {
    render(
      <IdeaCard
        idea={{ ...idea, id: "i1", supportCount: 2 }}
        supports={[makeSupport("Ms. Kim")]}
        onOpen={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ms\. Kim/)).toBeInTheDocument();
    expect(screen.queryByText(/Supported by 2 leaders/)).not.toBeInTheDocument();
  });

  it("calls onOpen when clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supports={noSupports} onOpen={onOpen} onUpvote={vi.fn()} />);
    await user.click(screen.getByRole("heading", { name: /Solar benches/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
