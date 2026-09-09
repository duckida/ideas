import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicBox } from "@/components/TopicBox";
import type { Idea, Topic } from "@/lib/types";

// next/link needs the app-router context; a plain <a> is enough here.
vi.mock("next/link", () => ({
  default: ({ href, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props} />
  ),
}));

const topic: Topic = {
  id: "t1",
  question: "What do you think of the timetable changes?",
  status: "approved",
  authorId: "u9",
  authorName: "Ms. Kim",
  createdAt: null,
  updatedAt: null,
};

const topic2: Topic = {
  id: "t2",
  question: "Favourite club idea?",
  status: "approved",
  authorId: "u8",
  authorName: "Mr. Park",
  createdAt: null,
  updatedAt: null,
};

const response: Idea = {
  id: "i1",
  title: "Too many room swaps",
  description: "It's confusing",
  status: "approved",
  authorId: "u1",
  authorName: "Ada",
  topicId: "t1",
  topicQuestion: topic.question,
  upvoteUserIds: ["u2"],
  upvoteCount: 1,
  supportCount: 0,
  showAuthorName: true,
  moderationFeedback: null,
  timeline: [],
  createdAt: null,
  updatedAt: null,
};

describe("TopicBox", () => {
  it("renders nothing at all when there are no live topics", () => {
    const { container } = render(
      <TopicBox topics={[]} previews={new Map()} onRespond={vi.fn()} onOpenIdea={vi.fn()} onUpvote={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows every live topic as its own card", () => {
    render(
      <TopicBox
        topics={[topic, topic2]}
        previews={new Map()}
        onRespond={vi.fn()}
        onOpenIdea={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );

    expect(screen.getByText("What do you think of the timetable changes?")).toBeInTheDocument();
    expect(screen.getByText("Favourite club idea?")).toBeInTheDocument();
    expect(screen.getByText("Set by Ms. Kim")).toBeInTheDocument();
    expect(screen.getByText("Set by Mr. Park")).toBeInTheDocument();
  });

  it("previews approved responses with a count-less upvote button, opening them on click", async () => {
    const user = userEvent.setup();
    const onOpenIdea = vi.fn();
    const onUpvote = vi.fn();
    render(
      <TopicBox
        topics={[topic]}
        previews={new Map([[topic.id, [response]]])}
        currentUserId="u1"
        onRespond={vi.fn()}
        onOpenIdea={onOpenIdea}
        onUpvote={onUpvote}
      />,
    );

    // The preview card no longer spells out the upvote count…
    expect(screen.queryByText("1 upvote")).not.toBeInTheDocument();
    // …it has the small count-less upvote button instead.
    const upvoteBtn = screen.getByRole("button", { name: "Upvote" });
    expect(upvoteBtn).not.toHaveTextContent("1");

    // The upvote button toggles the vote without opening the modal…
    await user.click(upvoteBtn);
    expect(onUpvote).toHaveBeenCalledWith(response);
    expect(onOpenIdea).not.toHaveBeenCalled();

    // …while clicking the card body opens the response.
    await user.click(screen.getByText("Too many room swaps"));
    expect(onOpenIdea).toHaveBeenCalledWith(response);
  });

  it("shows the upvote button as active when the current user has upvoted", () => {
    render(
      <TopicBox
        topics={[topic]}
        previews={new Map([[topic.id, [{ ...response, upvoteUserIds: ["u1"], upvoteCount: 1 }]]])}
        currentUserId="u1"
        onRespond={vi.fn()}
        onOpenIdea={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Upvote" }).className).toContain("bg-kakao");
  });

  it("links each card's circular arrow to the topic's own page", () => {
    render(
      <TopicBox
        topics={[topic, topic2]}
        previews={new Map()}
        onRespond={vi.fn()}
        onOpenIdea={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );

    const link1 = screen.getAllByRole("link", { name: "See all responses" })[0];
    expect(link1).toHaveAttribute("href", `/topics/${topic.id}`);
  });

  it("fires onRespond with the topic when the respond button is clicked", async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn();
    render(
      <TopicBox
        topics={[topic]}
        previews={new Map()}
        onRespond={onRespond}
        onOpenIdea={vi.fn()}
        onUpvote={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add your response" }));
    expect(onRespond).toHaveBeenCalledWith(topic);
  });
});
