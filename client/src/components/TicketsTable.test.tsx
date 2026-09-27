import { screen } from "@testing-library/react";
import type { TicketListItem } from "@/pages/Tickets";
import { renderWithProviders } from "@/test/render";
import TicketsTable from "./TicketsTable";

function makeListItem(overrides: Partial<TicketListItem> = {}): TicketListItem {
  return {
    id: "ticket-1",
    subject: "How do I reset my password?",
    status: "open",
    category: "general_question",
    senderName: "Alice Turner",
    senderEmail: "alice@customer.example",
    assignedTo: null,
    createdAt: "2026-09-15T07:15:13.668Z",
    ...overrides,
  };
}

function renderTable(tickets: TicketListItem[]) {
  return renderWithProviders(
    <TicketsTable
      tickets={tickets}
      isPending={false}
      sorting={[]}
      onSortingChange={() => {}}
    />,
  );
}

describe("TicketsTable", () => {
  it.each([
    ["new", "new"],
    ["processing", "processing"],
    ["open", "open"],
    ["resolved", "resolved"],
    ["closed", "closed"],
  ] as const)("renders a %s status badge", (status, label) => {
    renderTable([makeListItem({ status })]);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("links the subject to the ticket's detail page", () => {
    renderTable([makeListItem()]);

    expect(
      screen.getByRole("link", { name: "How do I reset my password?" }),
    ).toHaveAttribute("href", "/tickets/ticket-1");
  });
});
