import { useQuery } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { TicketDetail } from "@/types/ticket";
import { makeTicket } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import UpdateTicket from "./UpdateTicket";

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

const baseTicket = makeTicket();

const assignees = [
  { id: "agent-1", name: "Jordan Lee" },
  { id: "agent-2", name: "Priya Nair" },
];

beforeEach(() => {
  mockedAxios.get.mockReset();
  mockedAxios.patch.mockReset();
  mockedAxios.isAxiosError.mockReset();
});

// A successful update writes the returned ticket into the `["ticket", id]`
// query, and the page that owns that query passes the new value back down as
// the `ticket` prop. This stands in for that page so tests can see the
// updated value come back through the props.
function TicketFromCache({ initial }: { initial: TicketDetail }) {
  const { data } = useQuery({
    queryKey: ["ticket", initial.id],
    queryFn: () => Promise.resolve(initial),
    initialData: initial,
    staleTime: Infinity,
  });
  return <UpdateTicket ticket={data} />;
}

function renderUpdateTicket(ticket = baseTicket) {
  mockedAxios.get.mockImplementation((url: string) => {
    if (url === "/tickets/assignees") {
      return Promise.resolve({ data: { users: assignees } });
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  const user = userEvent.setup();
  renderWithProviders(<TicketFromCache initial={ticket} />);
  return user;
}

function mockAxiosErrors() {
  mockedAxios.isAxiosError.mockImplementation(
    (err: unknown) =>
      typeof err === "object" && err !== null && "response" in err,
  );
}

// Base UI's SelectTrigger role="combobox" doesn't get "name from contents"
// per the ARIA accname spec, so every trigger has an explicit aria-label.
function assignCombobox() {
  return screen.getByRole("combobox", { name: "Assigned to" });
}

function statusCombobox() {
  return screen.getByRole("combobox", { name: "Status" });
}

function categoryCombobox() {
  return screen.getByRole("combobox", { name: "Category" });
}

// Base UI mounts the popup/options asynchronously (positioning is computed
// after open), so every "open a select" helper waits for at least one option
// to actually be in the DOM before returning — otherwise a same-tick
// getByRole("option", ...) right after the click can race the popup mount.
async function openSelect(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("combobox", { name }));
  await screen.findAllByRole("option");
}

describe("UpdateTicket — details", () => {
  it("shows the sender as a mailto link and the created date", () => {
    renderUpdateTicket();

    expect(
      screen.getByRole("link", { name: baseTicket.senderEmail }),
    ).toHaveAttribute("href", `mailto:${baseTicket.senderEmail}`);
    expect(
      screen.getByText(new Date(baseTicket.createdAt).toLocaleString()),
    ).toBeInTheDocument();
  });
});

describe("UpdateTicket — assignment", () => {
  it("shows Unassigned when the ticket has no assignee", () => {
    renderUpdateTicket();

    expect(assignCombobox()).toHaveTextContent("Unassigned");
  });

  it("shows the current assignee's name when the ticket is already assigned", async () => {
    renderUpdateTicket({ ...baseTicket, assignedTo: assignees[0] });

    // The name is resolved from the assignees query, so it lands once that loads.
    await waitFor(() => {
      expect(assignCombobox()).toHaveTextContent("Jordan Lee");
    });
  });

  it("lists Unassigned plus every fetched assignee as options", async () => {
    const user = renderUpdateTicket();

    await openSelect(user, "Assigned to");

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
    const user = renderUpdateTicket();

    await openSelect(user, "Assigned to");
    await user.click(screen.getByRole("option", { name: "Priya Nair" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/tickets/${baseTicket.id}/assign`,
        { assignedToId: "agent-2" },
      );
    });
    await waitFor(() => {
      expect(assignCombobox()).toHaveTextContent("Priya Nair");
    });
  });

  it("unassigns an already-assigned ticket", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { ticket: { ...baseTicket, assignedTo: null } },
    });
    const user = renderUpdateTicket({ ...baseTicket, assignedTo: assignees[0] });

    await openSelect(user, "Assigned to");
    await user.click(screen.getByRole("option", { name: "Unassigned" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/tickets/${baseTicket.id}/assign`,
        { assignedToId: null },
      );
    });
    await waitFor(() => {
      expect(assignCombobox()).toHaveTextContent("Unassigned");
    });
  });

  it("shows a server error and keeps the previous assignee when the request fails", async () => {
    mockAxiosErrors();
    mockedAxios.patch.mockRejectedValue({
      response: { data: { error: "Assignee not found" } },
    });
    const user = renderUpdateTicket();

    await openSelect(user, "Assigned to");
    await user.click(screen.getByRole("option", { name: "Jordan Lee" }));

    expect(await screen.findByText("Assignee not found")).toBeInTheDocument();
    expect(assignCombobox()).toHaveTextContent("Unassigned");
  });
});

describe("UpdateTicket — status", () => {
  it("shows the ticket's current status", () => {
    renderUpdateTicket({ ...baseTicket, status: "resolved" });

    expect(statusCombobox()).toHaveTextContent("resolved");
  });

  it("lists all three statuses as options", async () => {
    const user = renderUpdateTicket();

    await openSelect(user, "Status");

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "open",
      "resolved",
      "closed",
    ]);
  });

  it("updates the status when a new option is selected", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { ticket: { ...baseTicket, status: "closed" } },
    });
    const user = renderUpdateTicket();

    await openSelect(user, "Status");
    await user.click(screen.getByRole("option", { name: "closed" }));

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/tickets/${baseTicket.id}/status`,
        { status: "closed" },
      );
    });
    await waitFor(() => {
      expect(statusCombobox()).toHaveTextContent("closed");
    });
  });

  it("shows a server error and keeps the previous status when the request fails", async () => {
    mockAxiosErrors();
    mockedAxios.patch.mockRejectedValue({
      response: { data: { error: "Invalid status" } },
    });
    const user = renderUpdateTicket();

    await openSelect(user, "Status");
    await user.click(screen.getByRole("option", { name: "resolved" }));

    expect(await screen.findByText("Invalid status")).toBeInTheDocument();
    expect(statusCombobox()).toHaveTextContent("open");
  });
});

describe("UpdateTicket — category", () => {
  it("shows the ticket's current category", () => {
    renderUpdateTicket({ ...baseTicket, category: "refund_request" });

    expect(categoryCombobox()).toHaveTextContent("Refund request");
  });

  it("lists all three categories as options", async () => {
    const user = renderUpdateTicket();

    await openSelect(user, "Category");

    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "General question",
      "Technical question",
      "Refund request",
    ]);
  });

  it("updates the category when a new option is selected", async () => {
    mockedAxios.patch.mockResolvedValue({
      data: { ticket: { ...baseTicket, category: "technical_question" } },
    });
    const user = renderUpdateTicket();

    await openSelect(user, "Category");
    await user.click(
      screen.getByRole("option", { name: "Technical question" }),
    );

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        `/tickets/${baseTicket.id}/category`,
        { category: "technical_question" },
      );
    });
    await waitFor(() => {
      expect(categoryCombobox()).toHaveTextContent("Technical question");
    });
  });

  it("shows a server error and keeps the previous category when the request fails", async () => {
    mockAxiosErrors();
    mockedAxios.patch.mockRejectedValue({
      response: { data: { error: "Invalid category" } },
    });
    const user = renderUpdateTicket();

    await openSelect(user, "Category");
    await user.click(screen.getByRole("option", { name: "Refund request" }));

    expect(await screen.findByText("Invalid category")).toBeInTheDocument();
    expect(categoryCombobox()).toHaveTextContent("General question");
  });
});
