import { screen, waitFor, within } from "@testing-library/react";
import Users from "./Users";
import { renderWithProviders } from "@/test/render";

const { mockedAxios } = vi.hoisted(() => {
  const mockedAxios = { get: vi.fn(), create: vi.fn() };
  mockedAxios.create.mockReturnValue(mockedAxios);
  return { mockedAxios };
});

vi.mock("axios", () => ({ default: mockedAxios }));

vi.mock("@/lib/auth-client", () => ({
  useSession: () => ({ data: { user: { name: "Admin User", role: "admin" } } }),
  authClient: { signOut: vi.fn() },
}));

const users = [
  {
    id: "1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "admin" as const,
    active: true,
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "agent" as const,
    active: false,
    createdAt: "2024-02-20T00:00:00.000Z",
  },
];

function getDataRows() {
  const table = screen.getByRole("table");
  return within(table).getAllByRole("row").slice(1);
}

beforeEach(() => {
  mockedAxios.get.mockReset();
});

describe("Users page", () => {
  it("shows skeleton rows while the users query is pending", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Users />);

    const rows = getDataRows();
    expect(rows).toHaveLength(5);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("renders a row per user once the data loads", async () => {
    mockedAxios.get.mockResolvedValue({ data: { users } });

    renderWithProviders(<Users />);

    await waitFor(() => {
      expect(getDataRows()).toHaveLength(2);
    });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  });

  it("shows role and status badges reflecting each user's data", async () => {
    mockedAxios.get.mockResolvedValue({ data: { users } });

    renderWithProviders(<Users />);
    await waitFor(() => expect(getDataRows()).toHaveLength(2));

    const [adaRow, graceRow] = getDataRows();

    expect(within(adaRow).getByText("admin")).toBeInTheDocument();
    expect(within(adaRow).getByText("Active")).toBeInTheDocument();

    expect(within(graceRow).getByText("agent")).toBeInTheDocument();
    expect(within(graceRow).getByText("Inactive")).toBeInTheDocument();
  });

  it("formats the joined date as a localized date string", async () => {
    mockedAxios.get.mockResolvedValue({ data: { users } });

    renderWithProviders(<Users />);
    await waitFor(() => expect(getDataRows()).toHaveLength(2));

    const expected = new Date(users[0].createdAt).toLocaleDateString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("shows an error message and no table when the request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network Error"));

    renderWithProviders(<Users />);

    expect(await screen.findByText("Network Error")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the users heading and nav bar", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Users />);

    expect(screen.getAllByText("Users").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
  });
});
