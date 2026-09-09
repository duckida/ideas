import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicBox } from "@/components/TopicBox";
import type { Topic } from "@/lib/types";

const topic: Topic = {
  id: "t1",
  question: "What do you think of the timetable changes?",
  status: "approved",
  authorId: "u9",
  authorName: "Ms. Kim",
  createdAt: null,
  updatedAt: null,
};

describe("TopicBox", () => {
  it("shows the live question with respond and set-topic actions for leaders", async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn();
    render(
      <TopicBox topic={topic} canSetTopic onRespond={onRespond} onNewTopic={vi.fn()} />,
    );

    expect(screen.getByText("What do you think of the timetable changes?")).toBeInTheDocument();
    expect(screen.getByText("Set by Ms. Kim")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add your response" }));
    expect(onRespond).toHaveBeenCalled();
  });

  it("hides the set-topic button from students", () => {
    render(<TopicBox topic={topic} canSetTopic={false} onRespond={vi.fn()} onNewTopic={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Add your response" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set a topic" })).not.toBeInTheDocument();
  });

  it("renders nothing for students when no topic is live", () => {
    const { container } = render(
      <TopicBox topic={null} canSetTopic={false} onRespond={vi.fn()} onNewTopic={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the empty state with a set-topic button for leaders when nothing is live", async () => {
    const user = userEvent.setup();
    const onNewTopic = vi.fn();
    render(<TopicBox topic={null} canSetTopic onRespond={vi.fn()} onNewTopic={onNewTopic} />);

    expect(screen.getByText("No topic right now — check back soon!")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set a topic" }));
    expect(onNewTopic).toHaveBeenCalled();
  });
});
