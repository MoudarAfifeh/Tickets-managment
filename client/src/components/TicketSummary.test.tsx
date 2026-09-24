import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTicket } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import TicketSummary from "./TicketSummary";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = {
    post: vi.fn(),
    create: vi.fn(),
    isAxiosError: vi.fn(),
  };
  mockedAxios.create.mockReturnValue(mockedAxios);
  return { mockedAxios };
});

vi.mock("axios", () => ({ default: mockedAxios }));

beforeEach(() => {
  mockedAxios.post.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

describe("TicketSummary", () => {
  it("renders a Summarize button and no summary text up front", () => {
    renderWithProviders(<TicketSummary ticket={makeTicket()} />);

    expect(
      screen.getByRole("button", { name: "Summarize" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/./, { selector: "p" })).not.toBeInTheDocument();
  });

  it("summarizes the ticket on click and shows the result", async () => {
    mockedAxios.post.mockResolvedValue({
      data: { summary: "Customer can't reset their password; unresolved." },
    });
    const ticket = makeTicket();
    const user = userEvent.setup();
    renderWithProviders(<TicketSummary ticket={ticket} />);

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/tickets/${ticket.id}/summarize`,
      );
    });
    expect(
      await screen.findByText(
        "Customer can't reset their password; unresolved.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a server error when summarizing fails", async () => {
    mockedAxios.isAxiosError.mockImplementation(
      (err: unknown) =>
        typeof err === "object" && err !== null && "response" in err,
    );
    mockedAxios.post.mockRejectedValue({
      response: { data: { error: "AI features are not configured" } },
    });
    const user = userEvent.setup();
    renderWithProviders(<TicketSummary ticket={makeTicket()} />);

    await user.click(screen.getByRole("button", { name: "Summarize" }));

    expect(
      await screen.findByText("AI features are not configured"),
    ).toBeInTheDocument();
  });

  it("does not summarize automatically on mount, even for a ticket with replies", () => {
    const ticket = makeTicket({
      replies: [
        {
          id: "reply-1",
          body: "Taking a look now.",
          senderType: "agent",
          createdAt: "2026-09-16T09:00:00.000Z",
          author: { id: "agent-1", name: "Jordan Lee" },
        },
      ],
    });
    renderWithProviders(<TicketSummary ticket={ticket} />);

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("re-summarizes automatically once a new reply arrives, but only after a summary already exists", async () => {
    mockedAxios.post.mockResolvedValue({ data: { summary: "First summary." } });
    const ticket = makeTicket();
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(<TicketSummary ticket={ticket} />);

    // No summary yet: adding a reply should not trigger a call.
    rerender(
      <TicketSummary ticket={makeTicket({ id: ticket.id, replies: [] })} />,
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();

    // Generate the first summary via the button.
    await user.click(screen.getByRole("button", { name: "Summarize" }));
    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("First summary.")).toBeInTheDocument();

    // A new reply arrives: the summary should regenerate automatically.
    mockedAxios.post.mockResolvedValue({
      data: { summary: "Updated summary." },
    });
    rerender(
      <TicketSummary
        ticket={makeTicket({
          id: ticket.id,
          replies: [
            {
              id: "reply-1",
              body: "Here's an update.",
              senderType: "agent",
              createdAt: "2026-09-16T09:00:00.000Z",
              author: { id: "agent-1", name: "Jordan Lee" },
            },
          ],
        })}
      />,
    );

    await waitFor(() => expect(mockedAxios.post).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Updated summary.")).toBeInTheDocument();
  });
});
