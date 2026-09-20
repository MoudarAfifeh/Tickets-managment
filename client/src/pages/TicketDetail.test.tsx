import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import TicketDetailPage from "./TicketDetail";
import { renderWithProviders } from "@/test/render";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = {
    get: vi.fn(),
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

const baseTicket = {
  id: "ticket-1",
  subject: "How do I reset my password?",
  body: "I can't find the reset link anywhere, can you help?",
  status: "open" as const,
  category: "general_question" as const,
  senderName: "Alice Turner",
  senderEmail: "alice@customer.example",
  assignedTo: null as { id: string; name: string } | null,
  createdAt: "2026-09-15T07:15:13.668Z",
  updatedAt: "2026-09-15T07:15:13.668Z",
};

const assignees = [
  { id: "agent-1", name: "Jordan Lee" },
  { id: "agent-2", name: "Priya Nair" },
];

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.patch.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

function renderPage(ticket = baseTicket) {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/tickets/assignees") {
      return Promise.resolve({ data: { users: assignees } });
    }
    if (url === `/tickets/${ticket.id}`) {
      return Promise.resolve({ data: { ticket } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  const user = userEvent.setup();
  renderWithProviders(
    <Routes>
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
    </Routes>,
    { initialEntries: [`/tickets/${ticket.id}`] },
  );
  return user;
}

async function openAssignSelect(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("combobox"));
}

describe("TicketDetail — assignment", () => {
  it("shows Unassigned when the ticket has no assignee", async () => {
    renderPage();

    expect(await screen.findByRole("combobox")).toHaveTextContent(
      "Unassigned",
    );
  });

  it("shows the current assignee's name when the ticket is already assigned", async () => {
    renderPage({ ...baseTicket, assignedTo: assignees[0] });

    expect(await screen.findByRole("combobox")).toHaveTextContent(
      "Jordan Lee",
    );
  });

  it("lists Unassigned plus every fetched assignee as options", async () => {
    const user = renderPage();

    await openAssignSelect(user);

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "Unassigned",
      "Jordan Lee",
      "Priya Nair",
    ]);
  });

  it("assigns the ticket to the selected agent", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { ticket: { ...baseTicket, assignedTo: assignees[1] } },
    });
    const user = renderPage();

    await openAssignSelect(user);
    await user.click(screen.getByRole("option", { name: "Priya Nair" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/tickets/${baseTicket.id}/assign`,
        { assignedToId: "agent-2" },
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Priya Nair");
    });
  });

  it("unassigns an already-assigned ticket", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { ticket: { ...baseTicket, assignedTo: null } },
    });
    const user = renderPage({ ...baseTicket, assignedTo: assignees[0] });

    await openAssignSelect(user);
    await user.click(screen.getByRole("option", { name: "Unassigned" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/tickets/${baseTicket.id}/assign`,
        { assignedToId: null },
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveTextContent("Unassigned");
    });
  });

  it("shows a server error and keeps the previous assignee when the request fails", async () => {
    // Only the assign mutation's rejection should read as an axios error —
    // the page also runs `axios.isAxiosError` against the ticket query's
    // (here absent) error, which must stay falsy for that check.
    mockedAxios.isAxiosError.mockImplementation(
      (err: unknown) =>
        typeof err === "object" && err !== null && "response" in err,
    );
    mockedAxios.patch.mockRejectedValue({
      response: { data: { error: "Assignee not found" } },
    });
    const user = renderPage();

    await openAssignSelect(user);
    await user.click(screen.getByRole("option", { name: "Jordan Lee" }));

    expect(await screen.findByText("Assignee not found")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Unassigned");
  });
});
