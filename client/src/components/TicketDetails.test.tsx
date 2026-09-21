import { render, screen } from "@testing-library/react";
import { makeTicket } from "@/test/fixtures";
import TicketDetails from "./TicketDetails";

describe("TicketDetails", () => {
  describe("subject", () => {
    it("renders the subject as the heading, with the short ticket number", () => {
      render(<TicketDetails ticket={makeTicket({ id: "abcdef1234567890" })} />);

      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "How do I reset my password?",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("Ticket #abcdef12")).toBeInTheDocument();
    });

    it("renders only one heading", () => {
      render(<TicketDetails ticket={makeTicket()} />);

      expect(screen.getAllByRole("heading")).toHaveLength(1);
    });
  });

  describe("sender", () => {
    it("renders the sender's name, initials, email and created date", () => {
      const ticket = makeTicket();
      render(<TicketDetails ticket={ticket} />);

      expect(screen.getByText("Alice Turner")).toBeInTheDocument();
      expect(screen.getByText("AT")).toBeInTheDocument();
      expect(
        screen.getByText(
          `${ticket.senderEmail} · ${new Date(ticket.createdAt).toLocaleString()}`,
        ),
      ).toBeInTheDocument();
    });

    it("falls back to the sender's email as the display name when there's no sender name", () => {
      render(<TicketDetails ticket={makeTicket({ senderName: null })} />);

      // Exact match: the "{email} · {date}" line is a different element, so
      // this only finds the display-name line.
      expect(screen.getByText("alice@customer.example")).toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("also falls back to the email when the sender name is an empty string", () => {
      render(<TicketDetails ticket={makeTicket({ senderName: "" })} />);

      expect(screen.getByText("alice@customer.example")).toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("uses the first two initials of a longer name, upper-cased", () => {
      render(
        <TicketDetails ticket={makeTicket({ senderName: "alice bob carol" })} />,
      );

      expect(screen.getByText("AB")).toBeInTheDocument();
    });

    it("uses a single initial for a one-word name", () => {
      render(<TicketDetails ticket={makeTicket({ senderName: "Madonna" })} />);

      expect(screen.getByText("M")).toBeInTheDocument();
    });
  });

  describe("message body", () => {
    it("renders the message body", () => {
      const ticket = makeTicket();
      render(<TicketDetails ticket={ticket} />);

      expect(screen.getByText(ticket.body)).toBeInTheDocument();
    });

    it("preserves the body's line breaks", () => {
      const body = "Line one\nLine two\n\nLine four";
      render(<TicketDetails ticket={makeTicket({ body })} />);

      const paragraph = screen.getByText(/Line one/);
      expect(paragraph.textContent).toBe(body);
      expect(paragraph).toHaveClass("whitespace-pre-wrap");
    });

    it("renders the body as plain text, never as HTML", () => {
      const body = "<b>bold</b> <script>window.__pwned = true</script>";
      const { container } = render(
        <TicketDetails ticket={makeTicket({ body })} />,
      );

      expect(screen.getByText(body)).toBeInTheDocument();
      expect(container.querySelector("b")).toBeNull();
      expect(container.querySelector("script")).toBeNull();
    });
  });

  describe("scope", () => {
    it("does not render the reply thread", () => {
      render(
        <TicketDetails
          ticket={makeTicket({
            replies: [
              {
                id: "reply-1",
                body: "Taking a look now.",
                senderType: "agent",
                createdAt: "2026-09-16T09:00:00.000Z",
                author: { id: "agent-1", name: "Jordan Lee" },
              },
            ],
          })}
        />,
      );

      expect(screen.queryByText("Taking a look now.")).not.toBeInTheDocument();
    });

    it("does not render the reply form", () => {
      render(<TicketDetails ticket={makeTicket()} />);

      expect(
        screen.queryByRole("button", { name: "Send reply" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Reply")).not.toBeInTheDocument();
    });
  });

  it("updates when the ticket prop changes", () => {
    const { rerender } = render(<TicketDetails ticket={makeTicket()} />);

    rerender(
      <TicketDetails
        ticket={makeTicket({
          id: "zyxwvuts9999",
          subject: "Refund for order 42",
          body: "Please refund me.",
          senderName: "Bob Stone",
        })}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Refund for order 42" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ticket #zyxwvuts")).toBeInTheDocument();
    expect(screen.getByText("Please refund me.")).toBeInTheDocument();
    expect(screen.getByText("Bob Stone")).toBeInTheDocument();
    expect(screen.getByText("BS")).toBeInTheDocument();
    expect(screen.queryByText("Alice Turner")).not.toBeInTheDocument();
  });
});
