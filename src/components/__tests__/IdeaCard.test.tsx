import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdeaCard } from "@/components/IdeaCard";
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
  upvoteCount: 3,
  supportCount: 0,
  moderationFeedback: null,
  timeline: [],
  createdAt: null,
  updatedAt: null,
};

beforeEach(() => setAuthUser(null));

describe("IdeaCard", () => {
  it("shows title, description, author and upvote count", () => {
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supportCount={0} onOpen={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Solar benches" })).toBeInTheDocument();
    expect(screen.getByText(/Charge your phone in the sun/)).toBeInTheDocument();
    expect(screen.getByText(/Ada/)).toBeInTheDocument();
    expect(screen.getByText("3 upvotes")).toBeInTheDocument();
  });

  it("shows the supported-by-leaders badge when leaders back it", () => {
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supportCount={2} onOpen={vi.fn()} />);
    expect(screen.getByText("Supported by leaders")).toBeInTheDocument();
  });

  it("does not show the badge without support", () => {
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supportCount={0} onOpen={vi.fn()} />);
    expect(screen.queryByText("Supported by leaders")).not.toBeInTheDocument();
  });

  it("calls onOpen when clicked", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<IdeaCard idea={{ ...idea, id: "i1" }} supportCount={0} onOpen={onOpen} />);
    await user.click(screen.getByRole("button", { name: /Solar benches/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});