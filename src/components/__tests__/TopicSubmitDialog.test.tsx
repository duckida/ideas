import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicSubmitDialog } from "@/components/TopicSubmitDialog";
import { setAuthUser } from "@/test/authMock";

const api = vi.hoisted(() => ({
  createTopic: vi.fn(async () => "new-topic-id"),
}));

vi.mock("@/lib/api", () => api);

vi.mock("@/context/AuthContext", async () => {
  const auth = await vi.importActual<typeof import("@/test/authMock")>("@/test/authMock");
  return { useAuth: () => auth.useAuthState() };
});

beforeEach(() => {
  vi.clearAllMocks();
  api.createTopic.mockResolvedValue("new-topic-id");
  setAuthUser({ uid: "u9", email: "kim@x.com", displayName: "Ms. Kim", role: "leader" });
});

describe("TopicSubmitDialog", () => {
  it("submits the question for moderation under the leader's name", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    render(<TopicSubmitDialog onClose={vi.fn()} onSubmitted={onSubmitted} />);

    await user.type(
      screen.getByLabelText("Question"),
      "What do you think of the timetable changes?",
    );
    await user.click(screen.getByRole("button", { name: "Submit for moderation" }));

    await waitFor(() =>
      expect(api.createTopic).toHaveBeenCalledWith({
        question: "What do you think of the timetable changes?",
        authorId: "u9",
        authorName: "Ms. Kim",
      }),
    );
    expect(onSubmitted).toHaveBeenCalled();
    expect(await screen.findByText(/Another moderator will approve it/)).toBeInTheDocument();
  });

  it("keeps the submit button disabled until a question is typed", () => {
    render(<TopicSubmitDialog onClose={vi.fn()} onSubmitted={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Submit for moderation" })).toBeDisabled();
  });

  it("surfaces a submission error to the user", async () => {
    const user = userEvent.setup();
    api.createTopic.mockRejectedValue(new Error("permission-denied"));
    render(<TopicSubmitDialog onClose={vi.fn()} onSubmitted={vi.fn()} />);

    await user.type(screen.getByLabelText("Question"), "A topic");
    await user.click(screen.getByRole("button", { name: "Submit for moderation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't submit your topic. Please try again.",
    );
  });
});
