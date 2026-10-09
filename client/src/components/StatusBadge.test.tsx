import { render, screen } from "@testing-library/react";
import type { TicketStatus } from "code";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it.each<[TicketStatus, string]>([
    ["new", "bg-status-new"],
    ["processing", "bg-status-processing"],
    ["open", "bg-status-open"],
    ["resolved", "bg-status-resolved"],
    ["closed", "bg-status-closed"],
  ])("renders %s with its own dot color", (status, dotClass) => {
    render(<StatusBadge status={status} />);

    const badge = screen.getByText(status);
    expect(badge).toHaveAttribute("data-status", status);

    const dot = badge.querySelector("[aria-hidden='true']");
    expect(dot).toHaveClass(dotClass);
  });
});
