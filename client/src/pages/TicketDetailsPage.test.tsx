import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import type { Reply, TicketDetail } from "@/types/ticket";
import { makeTicket } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import TicketDetailsPage from "./TicketDetailsPage";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    create: vi.fn(),
    isAxiosError: vi.fn(),
  };
  mockedAxios.create.mockReturnValue(mockedAxios);
  return { mockedAxios };
});

vi.mock("axios", () => ({ default: mockedAxios }));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { name: "Admin User", role: "admin" } } }),
  authClient: { signOut: vi.fn() },
}));

const baseTicket = makeTicket();

const assignees = [
  { id: "agent-1", name: "Jordan Lee" },
  { id: "agent-2", name: "Priya Nair" },
];

const agentReply: Reply = {
  id: "reply-1",
  body: "Thanks for reaching out, taking a look now.",
  senderType: "agent",
  createdAt: "2026-09-16T09:00:00.000Z",
  author: { id: "agent-1", name: "Jordan Lee" },
};

const customerReply: Reply = {
  id: "reply-2",
  body: "Any update on this?",
  senderType: "customer",
  createdAt: "2026-09-17T09:00:00.000Z",
  author: null,
};

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.post.mockReset();
  mockedAxios.patch.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

// `getTicket` is called on every fetch of the ticket, so a test can return a
// different ticket the second time (e.g. after a reply is posted).
function renderPage(getTicket: () => TicketDetail = () => baseTicket) {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/tickets/assignees") {
      return Promise.resolve({ data: { users: assignees } });
    }
    if (url === `/tickets/${baseTicket.id}`) {
      return Promise.resolve({ data: { ticket: getTicket() } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  const user = userEvent.setup();
  renderWithProviders(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailsPage />} />
    </Routes>,
    { initialEntries: [`/tickets/${baseTicket.id}`] },
  );
  return user;
}

describe("TicketDetailsPage", () => {
  it("lays out the ticket details, reply thread, reply form and update controls", async () => {
    renderPage(() => makeTicket({ replies: [agentReply] }));

    // TicketDetails
    expect(
      await screen.findByRole("heading", { name: baseTicket.subject }),
    ).toBeInTheDocument();
    expect(screen.getByText(baseTicket.body)).toBeInTheDocument();
    // Replies
    expect(screen.getByText(agentReply.body)).toBeInTheDocument();
    // ReplyForm
    expect(screen.getByRole("button", { name: "Send reply" })).toBeInTheDocument();
    // UpdateTicket
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Assigned to" }),
    ).toBeInTheDocument();
  });

  it("links back to the ticket list", async () => {
    renderPage();
    await screen.findByText(baseTicket.body);

    expect(
      screen.getByRole("link", { name: "Back to tickets" }),
    ).toHaveAttribute("href", "/");
  });

  it("shows a customer reply under the ticket's sender, who is also the top sender block", async () => {
    renderPage(() => makeTicket({ replies: [customerReply] }));

    expect(await screen.findByText(customerReply.body)).toBeInTheDocument();
    expect(screen.getAllByText(baseTicket.senderName!)).toHaveLength(2);
  });

  it("refetches the ticket and shows the new reply after one is sent", async () => {
    let ticket = baseTicket;
    mockedAxios.post.mockImplementation(() => {
      ticket = makeTicket({ replies: [agentReply] });
      return Promise.resolve({ data: {} });
    });
    const user = renderPage(() => ticket);
    await screen.findByText(baseTicket.body);
    expect(screen.queryByText(agentReply.body)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Reply"), agentReply.body);
    await user.click(screen.getByRole("button", { name: "Send reply" }));

    expect(await screen.findByText(agentReply.body)).toBeInTheDocument();
  });

  it("reflects an update made in the update controls", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { ticket: { ...baseTicket, status: "closed" } },
    });
    const user = renderPage();

    await user.click(await screen.findByRole("combobox", { name: "Status" }));
    await user.click(await screen.findByRole("option", { name: "closed" }));

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
        "closed",
      );
    });
  });

  it("shows a not-found state for a 404", async () => {
    mockedAxios.isAxiosError.mockImplementation(
      (err: unknown) =>
        typeof err === "object" && err !== null && "response" in err,
    );
    mockedAxios.get.mockRejectedValue({
      response: { status: 404 },
      message: "Request failed with status code 404",
    });
    renderWithProviders(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { initialEntries: ["/tickets/does-not-exist"] },
    );

    expect(await screen.findByText("Ticket not found")).toBeInTheDocument();
    expect(
      screen.getByText("This ticket doesn't exist or may have been removed."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("shows the error message for any other failure", async () => {
    mockedAxios.isAxiosError.mockImplementation(
      (err: unknown) =>
        typeof err === "object" && err !== null && "response" in err,
    );
    // A 4xx other than 404 isn't retried, so the error state shows straight away.
    mockedAxios.get.mockRejectedValue({
      response: { status: 400 },
      message: "Bad request",
    });
    renderWithProviders(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { initialEntries: ["/tickets/bad"] },
    );

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Bad request")).toBeInTheDocument();
  });
});
