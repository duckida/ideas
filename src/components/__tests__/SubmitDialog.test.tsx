import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubmitDialog } from "@/components/SubmitDialog";
import { setAuthUser } from "@/test/authMock";

const api = vi.hoisted(() => ({
  createIdea: vi.fn(async () => "new-id"),
}));

vi.mock("@/lib/api", () => api);

vi.mock("@/context/AuthContext", async () => {
  const auth = await vi.importActual<typeof import("@/test/authMock")>("@/test/authMock");
  return { useAuth: () => auth.useAuthState() };
});

beforeEach(() => {
  vi.clearAllMocks();
  api.createIdea.mockResolvedValue("new-id");
  setAuthUser({ uid: "u1", email: "a@x.com", displayName: "Ada", role: "student" });
});

describe("SubmitDialog", () => {
  it("submits an idea with reveal-name on by default", async () => {
    const user = userEvent.setup();
    const onSubmitted = vi.fn();
    render(<SubmitDialog onClose={vi.fn()} onSubmitted={onSubmitted} />);

    await user.type(screen.getByLabelText("Title"), "Solar benches");
    await user.type(screen.getByLabelText("Description"), "Charge your phone in the sun");
    await user.click(screen.getByRole("button", { name: "Submit for moderation" }));

    await waitFor(() =>
      expect(api.createIdea).toHaveBeenCalledWith({
        title: "Solar benches",
        description: "Charge your phone in the sun",
        authorId: "u1",
        authorName: "Ada",
        showAuthorName: true,
      }),
    );
    expect(onSubmitted).toHaveBeenCalled();
    expect(await screen.findByText(/in for review/)).toBeInTheDocument();
  });

  it("passes showAuthorName: false when the checkbox is unchecked", async () => {
    const user = userEvent.setup();
    render(<SubmitDialog onClose={vi.fn()} onSubmitted={vi.fn()} />);

    await user.click(screen.getByLabelText(/Reveal my name/));
    await user.type(screen.getByLabelText("Title"), "Secret idea");
    await user.type(screen.getByLabelText("Description"), "You'll see");
    await user.click(screen.getByRole("button", { name: "Submit for moderation" }));

    await waitFor(() =>
      expect(api.createIdea).toHaveBeenCalledWith(
        expect.objectContaining({ showAuthorName: false }),
      ),
    );
  });

  it("surfaces a submission error to the user", async () => {
    const user = userEvent.setup();
    api.createIdea.mockRejectedValue(new Error("ideas_rate_limited"));
    render(<SubmitDialog onClose={vi.fn()} onSubmitted={vi.fn()} />);

    await user.type(screen.getByLabelText("Title"), "Solar benches");
    await user.type(screen.getByLabelText("Description"), "Charge your phone in the sun");
    await user.click(screen.getByRole("button", { name: "Submit for moderation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Couldn't submit your idea. Please try again.",
    );
  });
});
