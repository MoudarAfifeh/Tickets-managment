import { screen, waitFor } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { renderWithProviders } from "@/test/render";
import type { DashboardStats } from "@/types/dashboard";

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

// Matches the shape `GET /api/tickets/stats` returns: 30 UTC-day buckets,
// oldest first, ending today. Max count is 10 (2026-09-14), so the chart's
// y-axis should read 0/10.
const ticketsPerDay = [
  { date: "2026-08-29", count: 0 },
  { date: "2026-08-30", count: 0 },
  { date: "2026-08-31", count: 1 },
  { date: "2026-09-01", count: 1 },
  { date: "2026-09-02", count: 0 },
  { date: "2026-09-03", count: 1 },
  { date: "2026-09-04", count: 1 },
  { date: "2026-09-05", count: 1 },
  { date: "2026-09-06", count: 2 },
  { date: "2026-09-07", count: 2 },
  { date: "2026-09-08", count: 1 },
  { date: "2026-09-09", count: 3 },
  { date: "2026-09-10", count: 4 },
  { date: "2026-09-11", count: 3 },
  { date: "2026-09-12", count: 5 },
  { date: "2026-09-13", count: 7 },
  { date: "2026-09-14", count: 10 },
  { date: "2026-09-15", count: 10 },
  { date: "2026-09-16", count: 0 },
  { date: "2026-09-17", count: 0 },
  { date: "2026-09-18", count: 0 },
  { date: "2026-09-19", count: 0 },
  { date: "2026-09-20", count: 0 },
  { date: "2026-09-21", count: 0 },
  { date: "2026-09-22", count: 3 },
  { date: "2026-09-23", count: 0 },
  { date: "2026-09-24", count: 4 },
  { date: "2026-09-25", count: 1 },
  { date: "2026-09-26", count: 0 },
  { date: "2026-09-27", count: 3 },
];

const stats: DashboardStats = {
  totalTickets: 63,
  openTickets: 47,
  aiResolvedCount: 12,
  aiResolvedPercentage: 19.047619047619047,
  averageResolutionMs: 5_400_000, // 1h 30m
  ticketsPerDay,
};

// Mirrors the component's own UTC-safe date parsing, so assertions aren't
// tied to a hardcoded locale string.
function expectedFullDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
  );
}

beforeEach(() => {
  mockedAxios.get.mockReset();
});

describe("Dashboard page", () => {
  it("shows skeletons while the stats query is pending", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText("Total tickets")).toBeInTheDocument();
    expect(screen.queryByText("63")).not.toBeInTheDocument();
    expect(screen.getByText("Tickets per day")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /ticket/i }),
    ).not.toBeInTheDocument();
  });

  it("renders each stat once the data loads", async () => {
    mockedAxios.get.mockResolvedValue({ data: stats });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("63")).toBeInTheDocument();
    });

    expect(screen.getByText("47")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("19.0%")).toBeInTheDocument();
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
  });

  it("shows a dash for average resolution time when nothing has been resolved yet", async () => {
    mockedAxios.get.mockResolvedValue({
      data: { ...stats, averageResolutionMs: null },
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("shows an error message and no stats when the request fails", async () => {
    mockedAxios.get.mockRejectedValue(new Error("Network Error"));

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("Network Error")).toBeInTheDocument();
    expect(screen.queryByText("Total tickets")).not.toBeInTheDocument();
    expect(screen.queryByText("Tickets per day")).not.toBeInTheDocument();
  });

  it("renders the dashboard heading and nav bar", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Tickets" })).toBeInTheDocument();
  });
});

describe("tickets-per-day chart", () => {
  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: stats });
  });

  it("renders one bar per day with a rounded y-axis max", async () => {
    const { container } = renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /ticket/i })).toHaveLength(30);
    });

    const yAxis = container.querySelector('[data-slot="chart-y-axis"]');
    expect(yAxis).not.toBeNull();
    expect(yAxis).toHaveTextContent("10");
    expect(yAxis).toHaveTextContent("0");
  });

  it("labels each bar with its date and ticket count for hover/focus", async () => {
    renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /ticket/i })).toHaveLength(30));

    expect(
      screen.getByRole("button", {
        name: `${expectedFullDate("2026-09-14")}: 10 tickets`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `${expectedFullDate("2026-08-31")}: 1 ticket`,
      }),
    ).toBeInTheDocument();
  });

  it("exposes every day's value in an accessible table", async () => {
    const { container } = renderWithProviders(<Dashboard />);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /ticket/i })).toHaveLength(30));

    expect(
      screen.getByText("Tickets created per day, last 30 days"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("table tbody tr")).toHaveLength(30);
  });
});
