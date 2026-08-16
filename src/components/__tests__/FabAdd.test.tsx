import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FabAdd } from "@/components/FabAdd";

describe("FabAdd", () => {
  it("renders the add button and calls onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<FabAdd onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Add an idea" });
    expect(button).toBeInTheDocument();
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});