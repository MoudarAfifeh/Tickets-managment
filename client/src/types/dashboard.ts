// Shape of `GET /api/tickets/stats`, which powers the dashboard page.
export type DashboardStats = {
  totalTickets: number;
  openTickets: number;
  aiResolvedCount: number;
  aiResolvedPercentage: number;
  // null when no ticket has ever been resolved yet (no data to average).
  averageResolutionMs: number | null;
  // Always exactly 30 entries, oldest first, ending today (UTC calendar
  // days) — days with no tickets still appear with count 0.
  ticketsPerDay: { date: string; count: number }[];
};
