import { render, screen } from "@testing-library/react";
import type { Reply } from "@/types/ticket";
import { makeTicket } from "@/test/fixtures";
import Replies from "./Replies";

const agentReply: Reply = {
  id: "reply-1",
  body: "Try the reset link on the login page.",
  senderType: "agent",
  createdAt: "2026-09-15T08:00:00.000Z",
  author: { id: "agent-1", name: "Jordan Lee" },
};

const customerReply: Reply = {
  id: "reply-2",
  body: "Thanks, that worked!",
  senderType: "customer",
  createdAt: "2026-09-15T09:30:00.000Z",
  author: null,
};

describe("Replies", () => {
  it("renders nothing when the ticket has no replies", () => {
    const { container } = render(<Replies ticket={makeTicket()} />);

    expect(container).toBeEmptyDOMElement();
  });

  describe("agent replies", () => {
    it("renders an agent reply under its author's name with an agent badge", () => {
      render(<Replies ticket={makeTicket({ replies: [agentReply] })} />);

      expect(screen.getByText(agentReply.body)).toBeInTheDocument();
      expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
      expect(screen.getByText("agent")).toBeInTheDocument();
      expect(screen.getByText("JL")).toBeInTheDocument();
      expect(
        screen.getByText(new Date(agentReply.createdAt).toLocaleString()),
      ).toBeInTheDocument();
    });

    it("falls back to 'Agent' when an agent reply has no author", () => {
      render(
        <Replies
          ticket={makeTicket({ replies: [{ ...agentReply, author: null }] })}
        />,
      );

      expect(screen.getByText("Agent")).toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("shows the author's name, never the ticket sender's", () => {
      render(<Replies ticket={makeTicket({ replies: [agentReply] })} />);

      expect(screen.queryByText("Alice Turner")).not.toBeInTheDocument();
      expect(
        screen.queryByText("alice@customer.example"),
      ).not.toBeInTheDocument();
    });

    it("uses a single initial for a one-word author name", () => {
      render(
        <Replies
          ticket={makeTicket({
            replies: [
              { ...agentReply, author: { id: "agent-9", name: "Madonna" } },
            ],
          })}
        />,
      );

      expect(screen.getByText("Madonna")).toBeInTheDocument();
      expect(screen.getByText("M")).toBeInTheDocument();
    });
  });

  describe("customer replies", () => {
    it("renders a customer reply under the ticket's sender name, not an author", () => {
      render(<Replies ticket={makeTicket({ replies: [customerReply] })} />);

      expect(screen.getByText(customerReply.body)).toBeInTheDocument();
      expect(screen.getByText("Alice Turner")).toBeInTheDocument();
      expect(screen.getByText("customer")).toBeInTheDocument();
      expect(screen.getByText("AT")).toBeInTheDocument();
    });

    it("falls back to the sender's email for a customer reply when the ticket has no sender name", () => {
      render(
        <Replies
          ticket={makeTicket({ senderName: null, replies: [customerReply] })}
        />,
      );

      expect(screen.getByText("alice@customer.example")).toBeInTheDocument();
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("also falls back to the email when the sender name is an empty string", () => {
      render(
        <Replies
          ticket={makeTicket({ senderName: "", replies: [customerReply] })}
        />,
      );

      expect(screen.getByText("alice@customer.example")).toBeInTheDocument();
    });
  });

  describe("a thread with several replies", () => {
    const thread = makeTicket({
      replies: [
        agentReply,
        customerReply,
        {
          id: "reply-3",
          body: "Glad to hear it!",
          senderType: "agent",
          createdAt: "2026-09-15T10:15:00.000Z",
          author: { id: "agent-2", name: "Priya Nair" },
        },
      ],
    });

    it("renders every reply with its own author and timestamp", () => {
      render(<Replies ticket={thread} />);

      for (const reply of thread.replies) {
        expect(screen.getByText(reply.body)).toBeInTheDocument();
        expect(
          screen.getByText(new Date(reply.createdAt).toLocaleString()),
        ).toBeInTheDocument();
      }
      expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
      expect(screen.getByText("Alice Turner")).toBeInTheDocument();
      expect(screen.getByText("Priya Nair")).toBeInTheDocument();
    });

    it("labels each reply with its own sender type", () => {
      render(<Replies ticket={thread} />);

      expect(screen.getAllByText("agent")).toHaveLength(2);
      expect(screen.getAllByText("customer")).toHaveLength(1);
    });

    it("styles the agent and customer badges differently", () => {
      render(<Replies ticket={thread} />);

      const [agentBadge] = screen.getAllByText("agent");
      const customerBadge = screen.getByText("customer");
      expect(agentBadge).toHaveClass("bg-secondary");
      expect(customerBadge).toHaveClass("border-border");
      expect(customerBadge).not.toHaveClass("bg-secondary");
    });

    it("renders replies in the order given", () => {
      render(<Replies ticket={thread} />);

      const bodies = thread.replies.map((reply) =>
        screen.getByText(reply.body),
      );
      for (let i = 0; i < bodies.length - 1; i++) {
        expect(
          bodies[i].compareDocumentPosition(bodies[i + 1]) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
      }
    });
  });

  describe("reply body", () => {
    it("preserves the body's line breaks", () => {
      const body = "First line\nSecond line\n\nFourth line";
      render(
        <Replies
          ticket={makeTicket({ replies: [{ ...agentReply, body }] })}
        />,
      );

      const paragraph = screen.getByText(/First line/);
      expect(paragraph.textContent).toBe(body);
      expect(paragraph).toHaveClass("whitespace-pre-wrap");
    });

    it("renders the body as plain text, never as HTML", () => {
      const body = "<b>bold</b> <script>window.__pwned = true</script>";
      const { container } = render(
        <Replies
          ticket={makeTicket({ replies: [{ ...customerReply, body }] })}
        />,
      );

      expect(screen.getByText(body)).toBeInTheDocument();
      expect(container.querySelector("b")).toBeNull();
      expect(container.querySelector("script")).toBeNull();
    });
  });

  describe("when the ticket changes", () => {
    it("shows a newly added reply, keeping the existing ones", () => {
      const { rerender } = render(
        <Replies ticket={makeTicket({ replies: [agentReply] })} />,
      );
      expect(screen.queryByText(customerReply.body)).not.toBeInTheDocument();

      rerender(
        <Replies
          ticket={makeTicket({ replies: [agentReply, customerReply] })}
        />,
      );

      expect(screen.getByText(agentReply.body)).toBeInTheDocument();
      expect(screen.getByText(customerReply.body)).toBeInTheDocument();
    });

    it("shows the thread for a ticket that had none before", () => {
      const { container, rerender } = render(
        <Replies ticket={makeTicket()} />,
      );
      expect(container).toBeEmptyDOMElement();

      rerender(<Replies ticket={makeTicket({ replies: [agentReply] })} />);

      expect(screen.getByText(agentReply.body)).toBeInTheDocument();
    });
  });
});
